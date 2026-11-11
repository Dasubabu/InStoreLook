import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import type Database from 'better-sqlite3';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { PaymentMode } from '../contracts.js';
import { openDatabase, sqliteDatabase, type ShopDatabase } from './database.js';
import { ShopRepository, type Session } from './repository.js';
import { StripePayments } from './payments.js';
import { address, fields, identifier, integer, query, ShopError, text } from './validation.js';
import { sampleCatalog } from './sample-catalog.js';

export { ShopRepository } from './repository.js';
export { sqliteDatabase, postgresDatabase, openDatabase } from './database.js';
export interface ShopRouterOptions {
  sqlite?: Database.Database;
  database?: ShopDatabase;
  repository?: ShopRepository;
  env?: NodeJS.ProcessEnv;
  seed?: boolean;
  fetch?: typeof fetch;
}
const safeEqual=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
type Handler=(req:Request,res:Response,next:NextFunction)=>Promise<any>;
const asyncRoute=(handler:Handler)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve(handler(req,res,next)).catch(next);};

/** Mount before any global express.json(): /payments/webhook must receive raw bytes. */
export function createShopRouter(options:ShopRouterOptions={}): Router {
  const env=options.env||process.env;
  const production=env.NODE_ENV==='production'||!!env.VERCEL;
  const mode=env.SHOP_CATALOG_MODE==='sample'||(!env.SHOP_CATALOG_MODE&&!env.SHOP_DATABASE_URL&&env.CATALOG_SOURCE!=='mongo')?'sample':'live';
  const catalogOnly=production&&mode==='sample'&&!env.SHOP_DATABASE_URL&&!options.repository&&!options.database&&!options.sqlite;
  let repository:ShopRepository;
  let payments:StripePayments|undefined;
  let ready:Promise<void>|undefined;
  let origin='';
  const paymentModes:PaymentMode[]=[];
  const initialize=()=>ready||(ready=(async()=>{
    try {
      const configured=env.SHOP_APP_ORIGIN||(env.VERCEL_PROJECT_PRODUCTION_URL?`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`:!production?'http://localhost:3000':'');
      const url=new URL(configured);
      if (!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/'||(production&&url.protocol!=='https:'&&env.SHOP_ALLOW_LOCAL_DEMO!=='true')) throw new Error('Invalid origin');
      origin=url.origin;
      if (env.SHOP_CATALOG_MODE&&!['sample','live'].includes(env.SHOP_CATALOG_MODE)) throw new Error('Invalid catalog mode');
      if (env.SHOP_PAYMENT_MODE&&!['demo','stripe','disabled'].includes(env.SHOP_PAYMENT_MODE)) throw new Error('Invalid payment mode');
      repository=options.repository||new ShopRepository(options.database||(options.sqlite?sqliteDatabase(options.sqlite):openDatabase(env)),mode);
      if(production&&repository.db.dialect==='sqlite'&&!(env.SHOP_ALLOW_LOCAL_DEMO==='true'&&!env.VERCEL&&mode==='sample'&&env.SHOP_PAYMENT_MODE==='demo'))throw new Error('SQLite is not a production database');
      await repository.initialize(options.seed??mode==='sample');
      if (env.SHOP_PAYMENT_MODE==='demo') paymentModes.push('demo');
      if (env.SHOP_PAYMENT_MODE==='stripe'&&env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET) {
        payments=new StripePayments({secretKey:env.STRIPE_SECRET_KEY,webhookSecret:env.STRIPE_WEBHOOK_SECRET,origin,fetch:options.fetch},repository);
        paymentModes.push('stripe');
      }
    } catch { throw new ShopError(503,'SHOP_UNAVAILABLE','Commerce is not configured. Check the database and application origin configuration.'); }
  })());
  const router=express.Router();
  router.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');next();});
  const catalog=async()=>{if(catalogOnly)return sampleCatalog;await initialize();return repository;};
  // Public browsing is independent of guest sessions and checkout configuration.
  // A configured live catalog never falls back to samples on a database failure.
  router.get('/info',asyncRoute(async(_req,res)=>{
    if(!catalogOnly)await initialize();
    res.json({data:{mode,paymentModes,currency:'INR',sample:mode==='sample',cartAvailable:!catalogOnly,checkoutAvailable:!catalogOnly&&paymentModes.length>0}});
  }));
  router.get('/products',asyncRoute(async(req,res)=>{
    // Build from the public allowlist. Vercel catch-all functions may append
    // their matched wildcard and adapter metadata to req.query; none of that
    // is part of the shopper filter contract.
    const allowed=['search','category','brand','gender','size','color','fabric','fit','pattern','minPrice','maxPrice','minDiscount','minRating','status','sort','occasion','page','limit'] as const;
    const fromVercel=process.env.VERCEL==='1'||Boolean(req.headers['x-vercel-id']);
    const input=fromVercel
      ? Object.fromEntries(allowed.filter(key=>req.query[key]!==undefined).map(key=>[key,req.query[key]]))
      : req.query;
    res.json(await (await catalog()).products(query(input)));
  }));
  router.get('/products/:id',asyncRoute(async(req,res)=>res.json({data:await (await catalog()).product(identifier(req.params.id))})));
  router.get('/facets',asyncRoute(async(_req,res)=>res.json({data:await (await catalog()).facets()})));
  router.get('/suggestions',asyncRoute(async(req,res)=>{
    const input=fields(req.query,['q']);const q=text(input.q??'','search',200,true);
    res.json({data:q?await (await catalog()).suggestions(q):[]});
  }));
  router.use(asyncRoute(async(_req,_res,next)=>{await initialize();next();}));
  router.post('/payments/webhook',express.raw({type:'application/json',limit:'256kb'}),asyncRoute(async(req,res)=>{
    if (!payments) throw new ShopError(503,'PAYMENT_DISABLED','Payment integration is not configured');
    await payments.webhook(req.body,req.get('stripe-signature'));res.json({data:{received:true}});
  }));
  router.use(express.json({limit:'1mb',strict:true}));
  const cookieName=production?'__Host-shop_session':'shop_session';
  const setCookie=(res:Response,token:string)=>res.cookie(cookieName,token,{httpOnly:true,sameSite:'lax',secure:production,path:'/',maxAge:30*86400000});
  router.use(asyncRoute(async(req,res,next)=>{
    const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    const found=await repository.session(token);res.locals.shopSession=found.session;
    if (found.token) setCookie(res,found.token);
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      if (req.get('origin')!==origin||req.get('sec-fetch-site')==='cross-site') throw new ShopError(403,'ORIGIN_REJECTED','Request origin is not allowed');
      const csrf=req.get('x-csrf-token');
      if (!csrf||csrf.length>200||!safeEqual(csrf,found.session.csrf_token)) throw new ShopError(403,'CSRF_REJECTED','Refresh your session and retry');
    }
    next();
  }));
  const session=(res:Response)=>res.locals.shopSession as Session;
  router.get('/session',(_req,res)=>res.json({csrfToken:session(res).csrf_token,mode,paymentModes,admin:Number(session(res).admin_until)>Date.now()}));
  router.get('/cart',asyncRoute(async(_req,res)=>res.json({data:await repository.cart(session(res).id)})));
  router.post('/cart/items',asyncRoute(async(req,res)=>{
    const input=fields(req.body,['productId','variantId','quantity']);
    res.json({data:await repository.mutateCart(session(res).id,'add',{productId:identifier(input.productId),variantId:identifier(input.variantId),quantity:integer(input.quantity,'quantity',1,10)})});
  }));
  router.patch('/cart/items/:id',asyncRoute(async(req,res)=>{
    const input=fields(req.body,['quantity']);res.json({data:await repository.mutateCart(session(res).id,'update',{id:identifier(req.params.id),quantity:integer(input.quantity,'quantity',1,10)})});
  }));
  router.delete('/cart/items/:id',asyncRoute(async(req,res)=>res.json({data:await repository.mutateCart(session(res).id,'delete',{id:identifier(req.params.id)})})));
  router.post('/checkout',asyncRoute(async(req,res)=>{
    const input=fields(req.body,['address','paymentMode','idempotencyKey']);
    if (!paymentModes.includes(input.paymentMode)) throw new ShopError(503,'PAYMENT_DISABLED','Selected payment mode is not enabled');
    const result=await repository.checkout(session(res).id,address(input.address),input.paymentMode,identifier(input.idempotencyKey));
    if (input.paymentMode==='stripe'&&result.order.status==='awaiting_payment') result.checkoutUrl=await payments!.create(result.order);
    res.json({data:result});
  }));
  router.get('/orders',asyncRoute(async(_req,res)=>res.json({data:await repository.orders(session(res).id)})));
  router.get('/orders/:id',asyncRoute(async(req,res)=>res.json({data:await repository.order(identifier(req.params.id),session(res).id)})));
  router.post('/orders/:id/cancel',asyncRoute(async(req,res)=>{
    if (!payments) throw new ShopError(503,'PAYMENT_DISABLED','Payment integration is not configured');
    const order=await repository.order(identifier(req.params.id),session(res).id);await payments.cancel(order);
    res.json({data:await repository.order(order.id,session(res).id)});
  }));
  const attempts=new Map<string,{count:number;until:number}>();
  router.post('/admin/login',asyncRoute(async(req,res)=>{
    const input=fields(req.body,['token']);const token=text(input.token,'admin token',512);
    if (!env.SHOP_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN.length<24) throw new ShopError(503,'ADMIN_DISABLED','Admin authentication is not configured');
    // Bounded process-local throttle; production ingress should additionally rate-limit across workers.
    const key=req.ip||'unknown',now=Date.now();
    for(const [ip,entry] of attempts) if(entry.until<=now)attempts.delete(ip);
    if(attempts.size>=10000&&!attempts.has(key))throw new ShopError(429,'RATE_LIMIT','Try again later');
    const attempt=attempts.get(key)||{count:0,until:now+15*60000};
    if(attempt.count>=10)throw new ShopError(429,'RATE_LIMIT','Try again later');
    if(!safeEqual(token,env.SHOP_ADMIN_TOKEN)){attempt.count++;attempts.set(key,attempt);throw new ShopError(401,'AUTH_FAILED','Invalid admin credentials');}
    attempts.delete(key);const rotated=await repository.privilege(session(res).id,true);setCookie(res,rotated.token);
    res.json({data:{admin:true},csrfToken:rotated.csrf});
  }));
  router.post('/admin/logout',asyncRoute(async(_req,res)=>{
    const rotated=await repository.privilege(session(res).id,false);setCookie(res,rotated.token);res.json({data:{admin:false},csrfToken:rotated.csrf});
  }));
  router.use('/admin',(_req,res,next)=>{if(Number(session(res).admin_until)<=Date.now())next(new ShopError(403,'ADMIN_REQUIRED','Admin session required'));else next();});
  router.get('/admin/summary',asyncRoute(async(_req,res)=>res.json({data:await repository.summary()})));
  router.post('/admin/import',asyncRoute(async(req,res)=>{
    const input=fields(req.body,['source','authorized','products']);
    if(input.authorized!==true)throw new ShopError(400,'AUTHORIZATION_REQUIRED','Confirm that you are authorized to use this catalog feed');
    const source=text(input.source,'feed source',120);
    if(!Array.isArray(input.products)||input.products.length<1||input.products.length>100)throw new ShopError(400,'IMPORT_LIMIT','Import between 1 and 100 products per batch');
    res.json({data:await repository.importProducts(source,input.products)});
  }));
  router.use((_req,_res,next)=>next(new ShopError(404,'NOT_FOUND','Commerce endpoint not found')));
  router.use((error:any,_req:Request,res:Response,_next:NextFunction)=>{
    if (error instanceof ShopError) return res.status(error.status).json({error:{code:error.code,message:error.message}});
    if(error?.type==='entity.too.large')return res.status(413).json({error:{code:'BODY_TOO_LARGE',message:'Request is too large'}});
    if(error instanceof SyntaxError||error?.type==='entity.parse.failed')return res.status(400).json({error:{code:'INVALID_JSON',message:'Invalid JSON request'}});
    // Never include database, payment-provider errors, credentials, or customer data.
    return res.status(500).json({error:{code:'INTERNAL_ERROR',message:'Commerce request failed'}});
  });
  return router;
}
let defaultRouter:Router|undefined;
export function getShopRouter():Router {return defaultRouter||(defaultRouter=createShopRouter());}
export default getShopRouter;
