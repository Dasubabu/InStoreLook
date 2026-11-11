import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { Server } from 'node:http';
import { createShopRouter } from './index.js';
import { openDatabase, sqliteDatabase } from './database.js';
import { ShopRepository } from './repository.js';
import { importNdjson } from '../../../scripts/catalog-import.js';
import type { ShopProduct } from '../contracts.js';

const origin='https://shop.test';
const adminToken='test-admin-token-at-least-24-characters';
const shipping={name:'Test Guest',email:'guest@example.test',phone:'+919876543210',line1:'10 Test Road',city:'Delhi',state:'Delhi',postalCode:'110001',country:'IN'};
const fixtureProduct=(id='test-shirt',stock=5):ShopProduct=>({id,name:'Cotton Shirt',brand:'Test Brand',category:'Shirts',gender:'Unisex',price:123.45,mrp:200,currency:'INR',stock,status:'In Stock',images:['https://example.test/shirt.jpg'],description:'A cotton shirt',color:'Blue',fabricType:'Cotton',fit:'Regular',pattern:'Solid',rating:4.5,inventorySource:'live',inventoryVerified:true,variants:[{id:`${id}-m`,sku:`${id}-SKU-M`,size:'M',color:'Blue',stock,priceMinor:12345}]});
class Client {
  cookie='';csrf='';
  constructor(private base:string){}
  async request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}) {
    const response=await fetch(this.base+'/api/shop'+path,{method,headers:{...(this.cookie?{Cookie:this.cookie}:{}),...(method!=='GET'?{Origin:origin,'X-CSRF-Token':this.csrf}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
    const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
    const data=await response.json();if(data.csrfToken)this.csrf=data.csrfToken;
    return {status:response.status,body:data,headers:response.headers};
  }
  async init(){const result=await this.request('/session');assert.equal(result.status,200);return result;}
  async add(quantity=1,id='test-shirt'){return this.request('/cart/items','POST',{productId:id,variantId:`${id}-m`,quantity});}
  async checkout(key='checkout-1',paymentMode='demo'){return this.request('/checkout','POST',{address:shipping,paymentMode,idempotencyKey:key});}
}
async function fixture(options:{stock?:number;path?:string;stripe?:typeof fetch;env?:NodeJS.ProcessEnv;sample?:boolean}={}) {
  const db=sqliteDatabase(new Database(options.path||':memory:'));
  const repository=new ShopRepository(db,options.sample?'sample':'live');
  await repository.initialize(!!options.sample);
  if(!options.sample)await repository.importProducts('test-feed',[fixtureProduct('test-shirt',options.stock??5)]);
  const app=express();
  app.use('/api/shop',createShopRouter({repository,seed:false,env:{NODE_ENV:'test',SHOP_APP_ORIGIN:origin,SHOP_CATALOG_MODE:options.sample?'sample':'live',SHOP_PAYMENT_MODE:options.stripe?'stripe':'demo',SHOP_ADMIN_TOKEN:adminToken,...(options.stripe?{STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_test_secret'}:{}),...options.env},fetch:options.stripe}));
  const server:Server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const address=server.address();assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}`;
  return {db,repository,base,client:()=>new Client(base),close:async()=>{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await db.close();}};
}
function signature(body:string,timestamp=Math.floor(Date.now()/1000),secret='whsec_test_secret') {
  return `t=${timestamp},v1=${createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')}`;
}
function event(orderId:string,id='evt_payment_1',overrides:any={}) {
  return {id,type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_session',metadata:{order_id:orderId},amount_total:12345,currency:'inr',payment_status:'paid',status:'complete',...overrides}}};
}
const stripeSuccess=(async()=>new Response(JSON.stringify({id:'cs_test_session',url:'https://checkout.stripe.com/c/pay/cs_test_session'}),{status:200,headers:{'Content-Type':'application/json'}})) as typeof fetch;

test('public catalog and facets work without guest session or AI, SQL pagination and filters',async()=>{
  const f=await fixture();try{
    const c=f.client();const list=await c.request('/products?search=cotton&size=M&minPrice=120&maxPrice=130&minRating=4&sort=price_asc&limit=1');
    assert.equal(list.status,200);assert.equal(list.body.total,1);assert.equal(list.body.data[0].variants[0].priceMinor,12345);assert.equal(c.cookie,'');
    assert.equal((await c.request('/products?page=2&limit=1')).body.data.length,0);
    assert.deepEqual((await c.request('/facets')).body.data.sizes,['M']);
    assert.deepEqual((await c.request('/suggestions?q=cotton')).body.data,['Cotton Shirt']);
    assert.equal((await c.request('/info')).body.data.currency,'INR');
    assert.equal((await c.request('/products/missing')).status,404);
  }finally{await f.close();}
});
test('production sample browsing works without checkout configuration and never creates a pretend cart', async () => {
  const app = express();
  app.use('/api/shop', createShopRouter({ env: { NODE_ENV: 'production', VERCEL: '1' } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const client = new Client(`http://127.0.0.1:${address.port}`);
  try {
    const info = await client.request('/info');
    assert.equal(info.status, 200);
    assert.deepEqual(info.body.data, { mode: 'sample', paymentModes: [], currency: 'INR', sample: true, cartAvailable: false, checkoutAvailable: false });
    const page = await client.request('/products?category=Kurtas&gender=Women&size=M&maxPrice=1500&status=In%20Stock&sort=price_asc&limit=1');
    assert.equal(page.status, 200); assert.equal(page.body.total, 2); assert.equal(page.body.totalPages, 2);
    assert.equal(page.body.data[0].id, 'sample-w-purple-kurta');
    assert.equal(page.body.data[0].variants.find((variant: any) => variant.size === 'M').priceMinor, 119900);
    assert.equal(page.body.catalogSource, 'sample');
    const routed = await client.request('/products?path=products&limit=1');
    assert.equal(routed.status, 200); assert.equal(routed.body.data.length, 1);
    assert.equal((await client.request('/products/sample-w-mustard-kurta')).body.data.inventoryVerified, false);
    assert.ok((await client.request('/facets')).body.data.brands.includes('PUMA'));
    assert.ok((await client.request('/suggestions?q=kurta')).body.data.length > 0);
    assert.equal((await client.request('/products?sort=price_asc&minPrice=2000&maxPrice=1000')).status, 400);
    assert.equal((await client.request('/products/missing')).status, 404);
    assert.equal(client.cookie, '');
    for (const path of ['/session', '/cart', '/orders']) {
      const result = await client.request(path);
      assert.equal(result.status, 503); assert.equal(result.body.error.code, 'SHOP_UNAVAILABLE');
    }
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
test('explicit live production mode never silently substitutes sample inventory', async () => {
  const app = express();
  app.use('/api/shop', createShopRouter({ env: { NODE_ENV: 'production', SHOP_CATALOG_MODE: 'live' } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/shop/products`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'SHOP_UNAVAILABLE');
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
test('guest cookie is HttpOnly/SameSite, hashes bearer tokens, binds CSRF and origin',async()=>{
  const f=await fixture();try{
    const a=f.client(),b=f.client();const session=await a.init();await b.init();
    assert.match(session.headers.get('set-cookie')!,/HttpOnly/);assert.match(session.headers.get('set-cookie')!,/SameSite=Lax/);
    const stored=(await f.db.query('SELECT token_hash FROM shop_sessions')).rows;
    assert.ok(stored.every(row=>!a.cookie.includes(row.token_hash)));
    assert.equal((await a.request('/cart/items','POST',{productId:'test-shirt',variantId:'test-shirt-m',quantity:1},{'X-CSRF-Token':''})).status,403);
    assert.equal((await a.request('/cart/items','POST',{productId:'test-shirt',variantId:'test-shirt-m',quantity:1},{'X-CSRF-Token':b.csrf})).status,403);
    assert.equal((await a.request('/cart/items','POST',{productId:'test-shirt',variantId:'test-shirt-m',quantity:1},{Origin:'https://evil.test'})).status,403);
    assert.equal((await a.add()).status,200);
  }finally{await f.close();}
});
test('HTTP lifecycle persists orders and stock through close and a fresh repository',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'shop-persistence-'));const path=join(folder,'shop.sqlite');const f=await fixture({path});
  let orderId='',cookie='';
  try{
    const c=f.client();await c.init();cookie=c.cookie;
    const added=await c.add(2);assert.equal(added.body.data.totalMinor,24690);
    const updated=await c.request(`/cart/items/${added.body.data.items[0].id}`,'PATCH',{quantity:3});assert.equal(updated.body.data.totalMinor,37035);
    const checkout=await c.checkout();assert.equal(checkout.status,200);assert.equal(checkout.body.data.order.status,'placed');assert.equal(checkout.body.data.order.paymentMode,'demo');
    orderId=checkout.body.data.order.id;assert.equal((await c.request('/cart')).body.data.items.length,0);
    assert.equal((await c.request('/orders')).body.data[0].id,orderId);
  }finally{await f.close();}
  const fresh=new ShopRepository(sqliteDatabase(new Database(path)),'live');
  try{
    await fresh.initialize(false);const session=await fresh.session(cookie.split('=')[1]);
    assert.equal((await fresh.order(orderId,session.session.id)).totalMinor,37035);
    assert.equal((await fresh.product('test-shirt')).variants[0].stock,2);
  }finally{await fresh.db.close();await rm(folder,{recursive:true,force:true});}
});
test('cross-session carts, order reads, mutations and cancellation remain isolated',async()=>{
  const f=await fixture();try{
    const a=f.client(),b=f.client();await a.init();await b.init();const added=await a.add();const id=added.body.data.items[0].id;
    assert.equal((await b.request('/cart')).body.data.items.length,0);
    assert.equal((await b.request('/cart/items/'+id,'PATCH',{quantity:2})).status,404);
    assert.equal((await b.request('/cart/items/'+id,'DELETE')).status,404);
    const order=(await a.checkout()).body.data.order;
    assert.equal((await b.request('/orders/'+order.id)).status,404);assert.equal((await b.request('/orders')).body.data.length,0);
  }finally{await f.close();}
});
test('cart price tampering and malformed/oversized quantities are rejected',async()=>{
  const f=await fixture();try{
    const c=f.client();await c.init();
    assert.equal((await c.request('/cart/items','POST',{productId:'test-shirt',variantId:'test-shirt-m',quantity:1,unitPriceMinor:1})).status,400);
    for(const quantity of [-1,0,11,1.5,'1',null,Number.MAX_SAFE_INTEGER])assert.equal((await c.add(quantity as number)).status,400);
    assert.equal((await c.request('/cart/items','POST',{productId:'other',variantId:'test-shirt-m',quantity:1})).status,404);
    assert.equal((await c.add()).status,200);
    assert.equal((await c.request('/checkout','POST',{address:shipping,paymentMode:'demo',idempotencyKey:'tampered',totalMinor:1})).status,400);
    assert.equal((await c.checkout()).body.data.order.totalMinor,12345);
  }finally{await f.close();}
});
test('checkout is idempotent and request-key conflicts do not create more orders',async()=>{
  const f=await fixture();try{
    const c=f.client();await c.init();await c.add(2);
    const results=await Promise.all([c.checkout('same-key'),c.checkout('same-key')]);
    assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(results[0].body.data.order.id,results[1].body.data.order.id);
    assert.equal((await f.repository.product('test-shirt')).stock,3);
    assert.equal((await c.request('/checkout','POST',{address:{...shipping,city:'Mumbai'},paymentMode:'demo',idempotencyKey:'same-key'})).status,409);
    assert.equal((await c.request('/orders')).body.data.length,1);
  }finally{await f.close();}
});
test('competing checkouts cannot oversell and a failed transaction retains its cart',async()=>{
  const f=await fixture({stock:1});try{
    const a=f.client(),b=f.client();await a.init();await b.init();await a.add();await b.add();
    const results=await Promise.all([a.checkout('a'),b.checkout('b')]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await f.repository.product('test-shirt')).stock,0);
    const loser=results[0].status===409?a:b;assert.equal((await loser.request('/cart')).body.data.items.length,1);
  }finally{await f.close();}
});
test('checkout revalidates current price and stock rather than stale cart totals',async()=>{
  const f=await fixture();try{
    const c=f.client();await c.init();await c.add();
    const changed=fixtureProduct();changed.variants[0].priceMinor=15000;await f.repository.importProducts('test-feed',[changed]);
    assert.equal((await c.checkout()).body.data.order.totalMinor,15000);
  }finally{await f.close();}
});
test('malformed addresses, malformed JSON and query injection are bounded',async()=>{
  const f=await fixture();try{
    const c=f.client();await c.init();await c.add();
    for(const change of [{country:'US'},{postalCode:'000000'},{email:'invalid'},{name:''},{line1:'x'.repeat(201)}])assert.equal((await c.request('/checkout','POST',{address:{...shipping,...change},paymentMode:'demo',idempotencyKey:'bad-address'})).status,400);
    assert.equal((await c.request('/cart/items','POST','{not json')).status,400);
    for(const q of ['limit=10000','page=-1','page=1.5','search[]=x','sort=DROP%20TABLE%20shop_products','minPrice=NaN','unknown=1'])assert.equal((await c.request('/products?'+q)).status,400);
    const attack=encodeURIComponent("' OR 1=1; DROP TABLE shop_products;--");
    assert.equal((await c.request('/products?search='+attack)).body.total,0);
    assert.equal((await c.request('/products')).body.total,1);
    const tooLarge=await c.request('/cart/items','POST',{padding:'x'.repeat(1024*1024+1)});assert.equal(tooLarge.status,413);assert.equal(tooLarge.body.error.code,'BODY_TOO_LARGE');
  }finally{await f.close();}
});
test('admin authentication rotates cookie/CSRF and imports require authorized schema-valid batches',async()=>{
  const f=await fixture();try{
    const c=f.client();await c.init();const originalCookie=c.cookie,originalCsrf=c.csrf;
    assert.equal((await c.request('/admin/summary')).status,403);
    assert.equal((await c.request('/admin/login','POST',{token:'wrong-token'})).status,401);
    assert.equal((await c.request('/admin/login','POST',{token:adminToken})).status,200);
    assert.notEqual(c.cookie,originalCookie);assert.notEqual(c.csrf,originalCsrf);
    assert.equal((await c.request('/admin/summary')).body.data.products,1);
    const p=fixtureProduct('imported');
    assert.equal((await c.request('/admin/import','POST',{source:'new-feed',authorized:false,products:[p]})).status,400);
    const body={source:'new-feed',authorized:true,products:[p]};
    assert.equal((await c.request('/admin/import','POST',body)).body.data.imported,1);
    assert.equal((await c.request('/admin/import','POST',body)).status,200);
    assert.equal((await f.repository.summary()).products,2);
    assert.equal(Number((await f.db.query("SELECT COUNT(*) AS n FROM shop_import_jobs WHERE source='new-feed'")).rows[0].n),1);
    for(const url of ['http://example.test/image.jpg','javascript:alert(1)','data:image/png;base64,xxx'])assert.equal((await c.request('/admin/import','POST',{...body,products:[{...p,images:[url]}]})).status,400);
    assert.equal((await c.request('/admin/import','POST',{...body,products:Array(101).fill(p)})).status,400);
    assert.equal((await c.request('/admin/logout','POST',{})).status,200);assert.equal((await c.request('/admin/summary')).status,403);
    const old=f.client();old.cookie=originalCookie;assert.equal((await old.request('/session')).body.admin,false);
  }finally{await f.close();}
});
test('feed conflicts roll back entire batch and existing SKU updates persist without duplicates',async()=>{
  const f=await fixture();try{
    const changed=fixtureProduct();changed.name='Updated Cotton Shirt';changed.variants[0].stock=8;
    await f.repository.importProducts('test-feed',[changed]);assert.equal((await f.repository.product(changed.id)).name,changed.name);
    const unique=fixtureProduct('new'),conflict=fixtureProduct('conflict');conflict.variants[0].sku=changed.variants[0].sku;
    await assert.rejects(f.repository.importProducts('test-feed',[unique,conflict]));
    assert.equal((await f.repository.summary()).products,1);
    await assert.rejects(f.repository.importProducts('another-feed',[changed]));
    assert.equal(Number((await f.db.query('SELECT COUNT(*) AS n FROM shop_variants')).rows[0].n),1);
  }finally{await f.close();}
});
test('NDJSON import streams through the shared validator with atomic batches and feed deduplication',async()=>{
  const f=await fixture();try{
    const lines=Array.from({length:105},(_,i)=>JSON.stringify(fixtureProduct('bulk-'+i))).join('\n');
    const result=await importNdjson(Readable.from([lines.slice(0,100),lines.slice(100)]),f.repository,'bulk-feed');assert.equal(result.imported,105);
    await importNdjson(Readable.from([lines]),f.repository,'bulk-feed');assert.equal((await f.repository.summary()).products,106);
    await assert.rejects(importNdjson(Readable.from(['{bad json}\n']),f.repository,'bad-feed'));
    await assert.rejects(importNdjson(Readable.from(['x'.repeat(1024*1024+1)]),f.repository,'bad-feed'));
  }finally{await f.close();}
});
test('sample seed happens only once, sample inventory stays labelled, and live mode does not seed',async()=>{
  const db=sqliteDatabase(new Database(':memory:'));const repository=new ShopRepository(db,'sample');
  try{await repository.initialize();const p=(await repository.products({limit:1})).data[0];assert.equal(p.inventorySource,'sample');assert.equal(p.inventoryVerified,false);
    await db.query('UPDATE shop_variants SET stock=0 WHERE product_id=$1',[p.id]);await repository.initialize();assert.equal((await repository.product(p.id)).stock,0);
  }finally{await db.close();}
  const live=new ShopRepository(sqliteDatabase(new Database(':memory:')),'live');try{await live.initialize();assert.equal((await live.summary()).products,0);}finally{await live.db.close();}
});
test('production/Vercel fail closed without PostgreSQL and root legacy sqlite path is refused',()=>{
  assert.throws(()=>openDatabase({NODE_ENV:'production'}),/SHOP_DATABASE_URL/);
  assert.throws(()=>openDatabase({NODE_ENV:'test',VERCEL:'1',SHOP_ALLOW_LOCAL_DEMO:'true',SHOP_CATALOG_MODE:'sample',SHOP_PAYMENT_MODE:'demo'}),/SHOP_DATABASE_URL/);
  assert.throws(()=>openDatabase({NODE_ENV:'test',SHOP_SQLITE_PATH:'sqlite.db'}),/legacy/);
});
test('payments are disabled unless explicitly enabled with required credentials',async()=>{
  const f=await fixture({env:{SHOP_PAYMENT_MODE:'stripe'}});try{
    const c=f.client();assert.deepEqual((await c.init()).body.paymentModes,[]);await c.add();assert.equal((await c.checkout('disabled','stripe')).status,503);
    assert.equal((await c.checkout('demo-disabled','demo')).status,503);assert.equal((await f.repository.product('test-shirt')).stock,5);
  }finally{await f.close();}
});
test('Stripe hosted session receives server totals and stable idempotency, stays unpaid until webhook',async()=>{
  const calls:any[]=[];const f=await fixture({stripe:(async(url,init)=>{calls.push({url,init});return stripeSuccess(url,init);}) as typeof fetch});try{
    const c=f.client();await c.init();await c.add();const checkout=await c.checkout('stripe-1','stripe');assert.equal(checkout.status,200);
    assert.equal(checkout.body.data.order.status,'awaiting_payment');assert.match(checkout.body.data.checkoutUrl,/^https:\/\/checkout.stripe.com/);
    const form=new URLSearchParams(calls[0].init.body);assert.equal(form.get('line_items[0][price_data][unit_amount]'),'12345');assert.equal(form.get('line_items[0][price_data][currency]'),'inr');
    assert.match(calls[0].init.headers['Idempotency-Key'],/^shop-order-/);assert.equal(form.get('metadata[order_id]'),checkout.body.data.order.id);
    await c.checkout('stripe-1','stripe');assert.equal(calls.length,1);
    assert.equal((await c.request('/orders/'+checkout.body.data.order.id+'?success=true')).body.data.status,'awaiting_payment');
  }finally{await f.close();}
});
test('raw webhook checks signature timestamp amount currency mode and session; replay cannot alter stock twice',async()=>{
  const f=await fixture({stripe:stripeSuccess});try{
    const c=f.client();await c.init();await c.add();const id=(await c.checkout('stripe','stripe')).body.data.order.id;
    const send=async(payload:any,sig?:string)=>{const raw=JSON.stringify(payload);return c.request('/payments/webhook','POST',raw,{'Stripe-Signature':sig||signature(raw)});};
    const valid=event(id);const raw=JSON.stringify(valid);
    assert.equal((await send(valid,signature(raw,Math.floor(Date.now()/1000)-301))).status,400);
    assert.equal((await send(valid,signature(raw,Math.floor(Date.now()/1000),'wrong'))).status,400);
    assert.equal((await send(event(id,'evt_tampered'),signature(raw))).status,400);
    for(const override of [{amount_total:1},{currency:'usd'},{id:'cs_wrong'}])assert.equal((await send(event(id,'evt_bad',override))).status,400);
    assert.equal((await send({...valid,livemode:true})).status,400);
    assert.equal((await send(event(id,'evt_unpaid',{payment_status:'unpaid'}))).status,200);
    assert.equal((await c.request('/orders/'+id)).body.data.status,'awaiting_payment');
    assert.equal((await send(valid)).status,200);assert.equal((await send(valid)).status,200);
    assert.equal((await c.request('/orders/'+id)).body.data.status,'paid');assert.equal((await f.repository.product('test-shirt')).stock,4);
    assert.equal(Number((await f.db.query('SELECT COUNT(*) AS n FROM shop_payment_events')).rows[0].n),1);
    assert.equal((await send({...event(id,'evt_late_expiry',{status:'expired',payment_status:'unpaid'}),type:'checkout.session.expired'})).status,200);
    assert.equal((await c.request('/orders/'+id)).body.data.status,'paid');assert.equal((await f.repository.product('test-shirt')).stock,4);
  }finally{await f.close();}
});
test('expiry webhook releases reservations once',async()=>{
  const f=await fixture({stripe:stripeSuccess});try{
    const c=f.client();await c.init();await c.add();const id=(await c.checkout('expire','stripe')).body.data.order.id;
    const expired={...event(id,'evt_expire',{status:'expired',payment_status:'unpaid'}),type:'checkout.session.expired'};
    for(let i=0;i<2;i++){const raw=JSON.stringify(expired);assert.equal((await c.request('/payments/webhook','POST',raw,{'Stripe-Signature':signature(raw)})).status,200);}
    assert.equal((await c.request('/orders/'+id)).body.data.status,'cancelled');assert.equal((await f.repository.product('test-shirt')).stock,5);
  }finally{await f.close();}
});
test('multi-item checkout rolls back earlier deductions when a later item is unavailable',async()=>{
  const f=await fixture();try{
    await f.repository.importProducts('test-feed',[fixtureProduct('aaa-first'),fixtureProduct('zzz-last')]);
    const c=f.client();await c.init();await c.add(1,'aaa-first');await c.add(1,'zzz-last');
    await f.db.query("UPDATE shop_variants SET stock=0 WHERE id='zzz-last-m'");
    assert.equal((await c.checkout()).status,409);
    assert.equal((await f.repository.product('aaa-first')).stock,5);assert.equal((await c.request('/cart')).body.data.items.length,2);
    assert.equal((await c.request('/orders')).body.data.length,0);
  }finally{await f.close();}
});
test('a later provider rejection cannot release a reservation after an ambiguous attempt',async()=>{
  let attempts=0;
  const f=await fixture({stripe:(async()=>{if(++attempts===1)throw new Error('network timeout');return new Response('{}',{status:400});}) as typeof fetch});
  try{
    const c=f.client();await c.init();await c.add();assert.equal((await c.checkout('retry','stripe')).status,502);
    assert.equal((await c.checkout('retry','stripe')).status,502);assert.equal((await f.repository.product('test-shirt')).stock,4);
    assert.equal((await c.request('/orders')).body.data[0].status,'awaiting_payment');
  }finally{await f.close();}
});
test('cancellation expires provider session before releasing stock and enforces order ownership',async()=>{
  let orderId='',expired=false;
  const fake=(async(url:any,init:any)=>{
    if(String(url).endsWith('/checkout/sessions')){orderId=new URLSearchParams(init.body).get('metadata[order_id]')!;return stripeSuccess(url,init);}
    if(String(url).endsWith('/expire'))expired=true;
    return new Response(JSON.stringify({id:'cs_test_session',metadata:{order_id:orderId},amount_total:12345,currency:'inr',payment_status:'unpaid',status:expired?'expired':'open'}));
  }) as typeof fetch;
  const f=await fixture({stripe:fake});try{
    const a=f.client(),b=f.client();await a.init();await b.init();await a.add();await a.checkout('cancel','stripe');
    assert.equal((await b.request('/orders/'+orderId+'/cancel','POST',{})).status,404);
    assert.equal((await a.request('/orders/'+orderId+'/cancel','POST',{})).status,200);assert.equal(expired,true);
    assert.equal((await f.repository.product('test-shirt')).stock,5);assert.equal((await a.request('/orders/'+orderId+'/cancel','POST',{})).status,409);
  }finally{await f.close();}
});
test('definitive provider creation rejection releases stock; uncertain network failures retain it safely',async()=>{
  for(const uncertain of [false,true]){
    const f=await fixture({stripe:(async()=>{if(uncertain)throw new Error('secret provider internals');return new Response('{}',{status:400});}) as typeof fetch});
    try{const c=f.client();await c.init();await c.add();const response=await c.checkout('failure','stripe');assert.equal(response.status,502);assert.ok(!JSON.stringify(response.body).includes('secret provider'));
      assert.equal((await f.repository.product('test-shirt')).stock,uncertain?4:5);assert.equal((await c.request('/orders')).body.data[0].status,uncertain?'awaiting_payment':'cancelled');
    }finally{await f.close();}
  }
});
