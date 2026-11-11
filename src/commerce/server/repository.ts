import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Cart, CartItem, CheckoutAddress, PaymentMode, ShopFacets, ShopOrder, ShopPage, ShopProduct, ShopQuery } from '../contracts.js';
import { sampleProducts } from './sample-catalog.js';
import type { Executor, ShopDatabase } from './database.js';
import { migrate } from './database.js';
import { product as validateProduct, query as validateQuery, ShopError, text } from './validation.js';
import { catalogSearch, discountExpression, searchTokens } from './catalog-search.js';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export interface Session { id: string; csrf_token: string; admin_until: number; expires_at: number }
export class ShopRepository {
  constructor(public db: ShopDatabase, public mode: 'sample' | 'live' = 'live') {}
  private lock() { return this.db.dialect === 'postgres' ? ' FOR UPDATE' : ''; }
  async initialize(seed = this.mode === 'sample') {
    await migrate(this.db);
    if (seed) await this.db.transaction(async tx => {
      if (this.db.dialect === 'postgres') await tx.query('SELECT pg_advisory_xact_lock(72510002)');
      if ((await tx.query("SELECT value FROM shop_meta WHERE key='sample_seed_v1'")).rows.length) return;
      const count = Number((await tx.query('SELECT COUNT(*) AS n FROM shop_products')).rows[0].n);
      if (!count) {
        const products = sampleProducts();
        await this.importInTransaction(tx, 'builtin-sample-v1', products);
      }
      await tx.query("INSERT INTO shop_meta(key,value) VALUES('sample_seed_v1','done')");
    });
  }
  async session(token?: string): Promise<{session: Session; token?: string}> {
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const found = (await this.db.query('SELECT id,csrf_token,admin_until,expires_at FROM shop_sessions WHERE token_hash=$1 AND expires_at>$2', [hash(token),Date.now()])).rows[0];
      if (found) return {session: found};
    }
    const newToken = randomBytes(32).toString('hex');
    const session = {id: randomUUID(),csrf_token:randomBytes(32).toString('hex'),admin_until:0,expires_at:Date.now()+30*86400000};
    await this.db.query('INSERT INTO shop_sessions(id,token_hash,csrf_token,admin_until,expires_at,created_at) VALUES($1,$2,$3,0,$4,$5)',[session.id,hash(newToken),session.csrf_token,session.expires_at,Date.now()]);
    return {session,token:newToken};
  }
  async privilege(sessionId: string, admin: boolean) {
    // Rotate the bearer credential on privilege changes; raw tokens never enter storage.
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    await this.db.query('UPDATE shop_sessions SET token_hash=$1,csrf_token=$2,admin_until=$3 WHERE id=$4',[hash(token),csrf,admin ? Date.now()+3600000 : 0,sessionId]);
    return {token,csrf};
  }
  private async hydrate(rows: any[], tx: Executor = this.db): Promise<ShopProduct[]> {
    if (!rows.length) return [];
    const ids = rows.map(row => row.id), placeholders = ids.map((_,i) => `$${i+1}`).join(',');
    const variants = (await tx.query(`SELECT * FROM shop_variants WHERE active=1 AND product_id IN (${placeholders}) ORDER BY id`,ids)).rows;
    const media = (await tx.query(`SELECT * FROM shop_media WHERE product_id IN (${placeholders}) ORDER BY position`,ids)).rows;
    return rows.map(row => {
      const vs = variants.filter(v=>v.product_id===row.id).map(v=>({id:v.id,sku:v.sku,size:v.size,color:v.color,stock:Number(v.stock),priceMinor:Number(v.price_minor)}));
      const ms = media.filter(m=>m.product_id===row.id).map(m=>({url:m.url,alt:m.alt,...(m.view_name?{view:m.view_name}:{}),...(m.source?{source:m.source}:{})}));
      const stock = vs.reduce((n,v)=>n+v.stock,0);
      return {...JSON.parse(row.details),id:row.id,name:row.name,brand:row.brand,category:row.category,gender:row.gender,
        color:row.color,description:row.description,price:Number(row.price_minor)/100,mrp:Number(row.mrp_minor)/100,currency:'INR',
        stock,status:stock?'In Stock':'Out of Stock',variants:vs,media:ms,images:ms.map(m=>m.url),imageUrl:ms[0]?.url,
        inventorySource:row.inventory_source,createdAt:Number(row.created_at),sizes:vs.map(v=>({id:v.id,productId:row.id,sizeLabel:v.size,stockQuantity:v.stock})),
      } as ShopProduct;
    });
  }
  async products(query: ShopQuery): Promise<ShopPage> {
    query=validateQuery(query);
    const values: unknown[] = [], conditions: string[] = [];
    const bind = (v: unknown) => {values.push(v);return `$${values.length}`;};
    for (const [key,col] of Object.entries({category:'category',brand:'brand',gender:'gender',fabric:'fabric',fit:'fit',pattern:'pattern',occasion:'occasion'})) {
      if (query[key]) conditions.push(`p.${col}=${bind(query[key])}`);
    }
    const variant=['v.product_id=p.id','v.active=1'];
    if(query.size)variant.push(`v.size=${bind(query.size)}`);
    if(query.color)variant.push(`v.color=${bind(query.color)}`);
    const selection=variant.join(' AND ');
    if(query.status==='In Stock')conditions.push(`EXISTS(SELECT 1 FROM shop_variants v WHERE ${selection} AND v.stock>0)`);
    else {
      if(query.size||query.color)conditions.push(`EXISTS(SELECT 1 FROM shop_variants v WHERE ${selection})`);
      // Out of stock refers to the selected size/color group, or the whole
      // product when none is selected. A different available color cannot pass.
      if(query.status==='Out of Stock')conditions.push(`NOT EXISTS(SELECT 1 FROM shop_variants v WHERE ${selection} AND v.stock>0)`);
    }
    const terms=searchTokens(query.search||'');
    let relevance='';
    if (query.search) {
      if(!terms.length)conditions.push('1=0');
      else if(this.db.dialect==='postgres')conditions.push(`p.search_document @@ ${bind(terms.map(term=>`'${term}'`).join(' & '))}::tsquery`);
      else for(const term of terms)conditions.push(`p.search_terms LIKE ${bind('% '+term+' %')}`);
    }
    if (query.minPrice !== undefined) conditions.push(`p.price_minor>=${bind(Math.round(Number(query.minPrice)*100))}`);
    if (query.maxPrice !== undefined) conditions.push(`p.price_minor<=${bind(Math.round(Number(query.maxPrice)*100))}`);
    if (query.minRating !== undefined) conditions.push(`p.rating>=${bind(Number(query.minRating))}`);
    if (query.minDiscount !== undefined) conditions.push(`${discountExpression}>=${bind(Number(query.minDiscount))}`);
    const where = conditions.length?' WHERE '+conditions.join(' AND '):'';
    const page = Number(query.page || 1), limit = Number(query.limit || 24);
    const total = Number((await this.db.query(`SELECT COUNT(*) AS n FROM shop_products p${where}`,values)).rows[0].n);
    if(terms.length&&(!query.sort||query.sort==='relevance')){
      // Identical ranking on both adapters, after indexed candidate selection on
      // PostgreSQL: title/brand/category > fabric/variant attributes > body/tags.
      relevance='('+terms.map(term=>{const pattern=bind('% '+term+' %');return `(CASE WHEN p.search_primary LIKE ${pattern} THEN 8 WHEN p.search_attributes LIKE ${pattern} THEN 4 ELSE 1 END)`;}).join('+')+') DESC';
    }
    const sorts: Record<string,string> = {relevance,price_asc:'p.price_minor ASC',price_desc:'p.price_minor DESC',rating:'p.rating DESC NULLS LAST',rating_desc:'p.rating DESC NULLS LAST',name:'p.name ASC',discount:discountExpression+' DESC',discount_desc:discountExpression+' DESC','price-low':'p.price_minor ASC','price-high':'p.price_minor DESC','price-low-high':'p.price_minor ASC','price-high-low':'p.price_minor DESC'};
    const order = sorts[query.sort || (terms.length?'relevance':'newest')] || 'p.created_at DESC';
    const rows = (await this.db.query(`SELECT p.* FROM shop_products p${where} ORDER BY ${order},p.id LIMIT ${bind(limit)} OFFSET ${bind((page-1)*limit)}`,values)).rows;
    return {data:await this.hydrate(rows),page,limit,total,totalPages:Math.ceil(total/limit),catalogSource:this.mode};
  }
  async product(id: string) {
    const p = (await this.hydrate((await this.db.query('SELECT * FROM shop_products WHERE id=$1',[id])).rows))[0];
    if (!p) throw new ShopError(404,'NOT_FOUND','Product not found');
    return p;
  }
  async facets(): Promise<ShopFacets> {
    const result = {} as ShopFacets;
    for (const [name,column] of Object.entries({brands:'brand',categories:'category',genders:'gender',fabrics:'fabric',fits:'fit',patterns:'pattern'})) {
      result[name] = (await this.db.query(`SELECT DISTINCT ${column} AS value FROM shop_products WHERE ${column}<>'' ORDER BY ${column} LIMIT 200`)).rows.map(r=>r.value);
    }
    result.sizes = (await this.db.query("SELECT DISTINCT size AS value FROM shop_variants WHERE active=1 AND size<>'' ORDER BY size LIMIT 200")).rows.map(r=>r.value);
    result.colors = (await this.db.query("SELECT DISTINCT color AS value FROM shop_variants WHERE active=1 AND color<>'' ORDER BY color LIMIT 200")).rows.map(r=>r.value);
    return result;
  }
  async suggestions(search: string) { return (await this.products({search,limit:8})).data.map(p=>p.name); }
  async cart(sessionId: string, tx: Executor = this.db): Promise<Cart> {
    const rows = (await tx.query(`SELECT c.id,c.quantity,c.updated_at,v.id AS variant_id,v.size,v.color,v.stock,v.price_minor,v.active,
      p.id AS product_id,p.name,p.brand,(SELECT url FROM shop_media WHERE product_id=p.id AND position=0) AS image_url
      FROM shop_cart_items c JOIN shop_variants v ON v.id=c.variant_id JOIN shop_products p ON p.id=v.product_id WHERE c.session_id=$1 ORDER BY c.id`,[sessionId])).rows;
    const items: CartItem[] = rows.map(r=>({id:r.id,productId:r.product_id,variantId:r.variant_id,name:r.name,brand:r.brand,imageUrl:r.image_url||undefined,size:r.size,color:r.color,quantity:Number(r.quantity),unitPriceMinor:Number(r.price_minor),lineTotalMinor:Number(r.quantity)*Number(r.price_minor),availableStock:r.active?Number(r.stock):0}));
    const subtotalMinor = items.reduce((n,item)=>n+item.lineTotalMinor,0);
    return {items,subtotalMinor,shippingMinor:0,totalMinor:subtotalMinor,currency:'INR',updatedAt:new Date(rows.length?Math.max(...rows.map(r=>Number(r.updated_at))):0).toISOString()};
  }
  async mutateCart(sessionId: string, operation: 'add'|'update'|'delete', input: {id?: string;productId?: string;variantId?:string;quantity?:number}) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT id FROM shop_sessions WHERE id=$1'+this.lock(),[sessionId]);
      if (operation==='delete') {
        const changed = await tx.query('DELETE FROM shop_cart_items WHERE id=$1 AND session_id=$2',[input.id,sessionId]);
        if (!changed.rowCount) throw new ShopError(404,'NOT_FOUND','Cart item not found');
      } else {
        const existing = operation==='update'
          ? (await tx.query('SELECT * FROM shop_cart_items WHERE id=$1 AND session_id=$2',[input.id,sessionId])).rows[0]
          : (await tx.query('SELECT * FROM shop_cart_items WHERE variant_id=$1 AND session_id=$2',[input.variantId,sessionId])).rows[0];
        if (operation==='update'&&!existing) throw new ShopError(404,'NOT_FOUND','Cart item not found');
        const v = (await tx.query('SELECT * FROM shop_variants WHERE id=$1 AND active=1',[operation==='update'?existing.variant_id:input.variantId])).rows[0];
        if (!v || (operation==='add'&&v.product_id!==input.productId)) throw new ShopError(404,'NOT_FOUND','Variant not found');
        const quantity = input.quantity! + (operation==='add'&&existing?Number(existing.quantity):0);
        if (quantity>10||quantity>v.stock) throw new ShopError(409,'STOCK_UNAVAILABLE','Requested quantity is unavailable');
        if (!existing && Number((await tx.query('SELECT COUNT(*) AS n FROM shop_cart_items WHERE session_id=$1',[sessionId])).rows[0].n)>=50) throw new ShopError(400,'CART_LIMIT','Cart is limited to 50 items');
        if (existing) await tx.query('UPDATE shop_cart_items SET quantity=$1,updated_at=$2 WHERE id=$3',[quantity,Date.now(),existing.id]);
        else await tx.query('INSERT INTO shop_cart_items(id,session_id,variant_id,quantity,updated_at) VALUES($1,$2,$3,$4,$5)',[randomUUID(),sessionId,v.id,quantity,Date.now()]);
      }
      return this.cart(sessionId,tx);
    });
  }
  private async orderFromRow(row: any, tx: Executor = this.db): Promise<ShopOrder> {
    return {id:row.id,status:row.status,paymentMode:row.payment_mode,items:(await tx.query('SELECT snapshot FROM shop_order_items WHERE order_id=$1 ORDER BY position',[row.id])).rows.map(r=>JSON.parse(r.snapshot)),subtotalMinor:Number(row.subtotal_minor),shippingMinor:Number(row.shipping_minor),totalMinor:Number(row.total_minor),currency:'INR',address:JSON.parse(row.address),createdAt:new Date(Number(row.created_at)).toISOString()};
  }
  async orderRecord(id: string, sessionId?: string) {
    const row = (await this.db.query(`SELECT * FROM shop_orders WHERE id=$1${sessionId?' AND session_id=$2':''}`,[id,...(sessionId?[sessionId]:[])])).rows[0];
    if (!row) throw new ShopError(404,'NOT_FOUND','Order not found'); return row;
  }
  async order(id: string, sessionId: string) { return this.orderFromRow(await this.orderRecord(id,sessionId)); }
  async orders(sessionId: string) {
    const rows = (await this.db.query('SELECT * FROM shop_orders WHERE session_id=$1 ORDER BY created_at DESC LIMIT 100',[sessionId])).rows;
    return Promise.all(rows.map(row=>this.orderFromRow(row)));
  }
  async checkout(sessionId: string, address: CheckoutAddress, mode: PaymentMode, key: string) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT id FROM shop_sessions WHERE id=$1'+this.lock(),[sessionId]);
      const requestHash = hash(JSON.stringify({address,mode}));
      const previous = (await tx.query('SELECT * FROM shop_orders WHERE session_id=$1 AND idempotency_key=$2',[sessionId,key])).rows[0];
      if (previous) {
        if (previous.request_hash!==requestHash) throw new ShopError(409,'IDEMPOTENCY_CONFLICT','This checkout key was already used with different details');
        return {order:await this.orderFromRow(previous,tx),checkoutUrl:previous.checkout_url||undefined};
      }
      const cart = await this.cart(sessionId,tx);
      if (!cart.items.length) throw new ShopError(409,'EMPTY_CART','Your cart is empty');
      // Deterministic row-lock ordering avoids checkout deadlocks between multi-item carts.
      for (const item of [...cart.items].sort((a,b)=>a.variantId.localeCompare(b.variantId))) {
        const v = (await tx.query('SELECT stock,price_minor,active FROM shop_variants WHERE id=$1'+this.lock(),[item.variantId])).rows[0];
        if (!v?.active || Number(v.stock)<item.quantity) throw new ShopError(409,'STOCK_UNAVAILABLE','An item is no longer available in the requested quantity');
        // Re-read after lock: an import may have changed price since the cart read.
        item.unitPriceMinor=Number(v.price_minor);item.lineTotalMinor=item.unitPriceMinor*item.quantity;item.availableStock=Number(v.stock);
        const changed = await tx.query('UPDATE shop_variants SET stock=stock-$1 WHERE id=$2 AND stock>=$1 AND active=1',[item.quantity,item.variantId]);
        if (!changed.rowCount) throw new ShopError(409,'STOCK_UNAVAILABLE','An item is no longer available');
      }
      cart.subtotalMinor=cart.items.reduce((n,item)=>n+item.lineTotalMinor,0);cart.totalMinor=cart.subtotalMinor;
      const id=randomUUID(),now=Date.now();
      await tx.query(`INSERT INTO shop_orders(id,session_id,idempotency_key,request_hash,status,payment_mode,subtotal_minor,shipping_minor,total_minor,currency,address,created_at,reservation_until)
        VALUES($1,$2,$3,$4,$5,$6,$7,0,$7,'INR',$8,$9,$10)`,[id,sessionId,key,requestHash,mode==='demo'?'placed':'awaiting_payment',mode,cart.totalMinor,JSON.stringify(address),now,now+3600000]);
      for (const [index,item] of cart.items.entries()) await tx.query('INSERT INTO shop_order_items(order_id,position,variant_id,quantity,unit_price_minor,snapshot) VALUES($1,$2,$3,$4,$5,$6)',[id,index,item.variantId,item.quantity,item.unitPriceMinor,JSON.stringify(item)]);
      await tx.query('DELETE FROM shop_cart_items WHERE session_id=$1',[sessionId]);
      return {order:await this.orderFromRow((await tx.query('SELECT * FROM shop_orders WHERE id=$1',[id])).rows[0],tx),checkoutUrl:undefined as string|undefined};
    });
  }
  async setProviderSession(orderId: string, providerId: string, url?: string) {
    await this.db.query('UPDATE shop_orders SET provider_session=$1,checkout_url=$2 WHERE id=$3 AND (provider_session IS NULL OR provider_session=$1)',[providerId,url||null,orderId]);
  }
  async providerCheckout(orderId: string, create: (row: any) => Promise<{id:string;url:string}>) {
    // Serialize provider creation per order, including across server workers. Persist
    // uncertain attempts so a later validation error can never release possibly-paid stock.
    const result = await this.db.transaction(async tx=>{
      const row=(await tx.query('SELECT * FROM shop_orders WHERE id=$1'+this.lock(),[orderId])).rows[0];
      if (row.status!=='awaiting_payment') return {url:undefined as string|undefined,error:undefined as any};
      if (row.checkout_url) return {url:row.checkout_url as string,error:undefined as any};
      await tx.query('UPDATE shop_orders SET provider_attempts=provider_attempts+1 WHERE id=$1',[orderId]);
      try {
        const provider=await create(row);
        await tx.query('UPDATE shop_orders SET provider_session=$1,checkout_url=$2 WHERE id=$3',[provider.id,provider.url,orderId]);
        return {url:provider.url,error:undefined as any};
      } catch(error:any) {
        if(error?.definitelyNotCreated===true&&Number(row.provider_attempts)===0) {
          for(const item of (await tx.query('SELECT variant_id,quantity FROM shop_order_items WHERE order_id=$1 ORDER BY variant_id',[orderId])).rows) {
            await tx.query('UPDATE shop_variants SET stock=stock+$1 WHERE id=$2',[item.quantity,item.variant_id]);
          }
          await tx.query("UPDATE shop_orders SET status='cancelled' WHERE id=$1",[orderId]);
        }
        return {url:undefined as string|undefined,error};
      }
    });
    if(result.error)throw result.error;
    return result.url;
  }
  async paymentEvent(eventId: string, orderId: string, session: {id:string;amount_total:number;currency:string;payment_status:string;status:string}, outcome: 'paid'|'cancelled') {
    return this.db.transaction(async tx=>{
      const row = (await tx.query('SELECT * FROM shop_orders WHERE id=$1'+this.lock(),[orderId])).rows[0];
      if (!row) throw new ShopError(404,'NOT_FOUND','Unknown payment order');
      if (row.payment_mode!=='stripe' || session.currency!=='inr' || session.amount_total!==Number(row.total_minor) || (row.provider_session&&row.provider_session!==session.id)) throw new ShopError(400,'PAYMENT_MISMATCH','Payment does not match order');
      if ((await tx.query('SELECT id FROM shop_payment_events WHERE id=$1',[eventId])).rows.length) return;
      if (outcome==='paid' && (session.payment_status!=='paid'||session.status!=='complete')) throw new ShopError(400,'PAYMENT_UNVERIFIED','Payment is not complete');
      if (outcome==='cancelled' && session.status!=='expired') throw new ShopError(409,'PAYMENT_PENDING','Payment session is not expired');
      if (row.status==='cancelled' && outcome==='paid') throw new ShopError(409,'PAYMENT_CONFLICT','Order is cancelled; payment requires reconciliation');
      if (row.status==='awaiting_payment') {
        if (outcome==='cancelled') {
          const items = (await tx.query('SELECT variant_id,quantity FROM shop_order_items WHERE order_id=$1 ORDER BY variant_id',[orderId])).rows;
          for (const item of items) await tx.query('UPDATE shop_variants SET stock=stock+$1 WHERE id=$2',[item.quantity,item.variant_id]);
        }
        await tx.query('UPDATE shop_orders SET status=$1,provider_session=$2 WHERE id=$3',[outcome,session.id,orderId]);
      }
      await tx.query('INSERT INTO shop_payment_events(id,order_id,created_at) VALUES($1,$2,$3)',[eventId,orderId,Date.now()]);
    });
  }
  async importProducts(source: string, values: unknown[]) {
    source=text(source,'feed source',120);
    if(!Array.isArray(values)||values.length<1||values.length>100)throw new ShopError(400,'IMPORT_LIMIT','Import between 1 and 100 products per batch');
    const products = values.map(validateProduct);
    if (new Set(products.map(p=>p.id)).size!==products.length) throw new ShopError(400,'INVALID_INPUT','Duplicate product identities');
    return this.db.transaction(tx=>this.importInTransaction(tx,source,products));
  }
  private async importInTransaction(tx: Executor, source: string, products: ShopProduct[]) {
    if (this.db.dialect==='postgres') await tx.query('SELECT pg_advisory_xact_lock(72510003)');
    const digest=hash(JSON.stringify(products));
    const previous=(await tx.query('SELECT imported FROM shop_import_jobs WHERE source=$1 AND digest=$2',[source,digest])).rows[0];
    if (previous) return {imported:Number(previous.imported)};
    for (const p of [...products].sort((a,b)=>a.id.localeCompare(b.id))) {
      const existing=(await tx.query('SELECT source FROM shop_products WHERE id=$1',[p.id])).rows[0];
      if (existing&&existing.source!==source) throw new ShopError(409,'FEED_CONFLICT','Product identity belongs to another feed');
      const {variants,media,images,imageUrl,stock,status,sizes,...details}=p;
      const search=catalogSearch(p,variants);
      await tx.query(`INSERT INTO shop_products(id,source,external_id,name,brand,category,gender,color,fabric,fit,pattern,occasion,description,price_minor,mrp_minor,rating,details,inventory_source,created_at,search_primary,search_attributes,search_terms)
        VALUES($1,$2,$1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,category=excluded.category,gender=excluded.gender,color=excluded.color,fabric=excluded.fabric,fit=excluded.fit,pattern=excluded.pattern,occasion=excluded.occasion,description=excluded.description,price_minor=excluded.price_minor,mrp_minor=excluded.mrp_minor,rating=excluded.rating,details=excluded.details,inventory_source=excluded.inventory_source,search_primary=excluded.search_primary,search_attributes=excluded.search_attributes,search_terms=excluded.search_terms`,
        [p.id,source,p.name,p.brand,p.category,p.gender,p.color,p.fabricType||'',p.fit||'',p.pattern||'',p.occasion||'',p.description,Math.round(p.price*100),Math.round((p.mrp||p.price)*100),p.rating??null,JSON.stringify(details),p.inventorySource,Date.now(),search.primary,search.attributes,search.terms]);
      // Keep referenced variant rows for historical orders, but remove them from sale.
      await tx.query('UPDATE shop_variants SET active=0 WHERE product_id=$1',[p.id]);
      for (const v of [...variants].sort((a,b)=>a.id.localeCompare(b.id))) {
        const owned=(await tx.query('SELECT product_id,id FROM shop_variants WHERE id=$1 OR sku=$2',[v.id,v.sku])).rows;
        if (owned.some(row=>row.product_id!==p.id||row.id!==v.id)) throw new ShopError(409,'SKU_CONFLICT','Variant identity or SKU belongs to another variant');
        // Feeds specify physical stock. Outstanding Stripe reservations stay deducted.
        const reserved=Number((await tx.query("SELECT COALESCE(SUM(i.quantity),0) AS n FROM shop_order_items i JOIN shop_orders o ON o.id=i.order_id WHERE i.variant_id=$1 AND o.status='awaiting_payment'",[v.id])).rows[0].n);
        if (v.stock<reserved) throw new ShopError(409,'RESERVATION_CONFLICT','Imported stock is below outstanding reservations');
        await tx.query(`INSERT INTO shop_variants(id,product_id,sku,size,color,stock,price_minor,active) VALUES($1,$2,$3,$4,$5,$6,$7,1)
          ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,size=excluded.size,color=excluded.color,stock=excluded.stock,price_minor=excluded.price_minor,active=1`,[v.id,p.id,v.sku,v.size,v.color,v.stock-reserved,v.priceMinor]);
      }
      await tx.query('DELETE FROM shop_media WHERE product_id=$1',[p.id]);
      const entries=media?.length?media:(images.length?images:imageUrl?[imageUrl]:[]).map(url=>({url,alt:p.name}));
      for (const [index,m] of entries.entries()) await tx.query('INSERT INTO shop_media(product_id,position,url,alt,view_name,source) VALUES($1,$2,$3,$4,$5,$6)',[p.id,index,m.url,m.alt,('view'in m&&m.view)||null,('source'in m&&m.source)||null]);
    }
    await tx.query('INSERT INTO shop_import_jobs(id,source,digest,imported,created_at) VALUES($1,$2,$3,$4,$5)',[randomUUID(),source,digest,products.length,Date.now()]);
    return {imported:products.length};
  }
  async summary() {
    const products=Number((await this.db.query('SELECT COUNT(*) AS n FROM shop_products')).rows[0].n);
    const orders=Number((await this.db.query('SELECT COUNT(*) AS n FROM shop_orders')).rows[0].n);
    const lowStock=Number((await this.db.query('SELECT COUNT(*) AS n FROM shop_variants WHERE active=1 AND stock<3')).rows[0].n);
    return {products,orders,lowStock,mode:this.mode};
  }
}
