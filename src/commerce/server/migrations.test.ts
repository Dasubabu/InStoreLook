import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrate, sqliteDatabase, type ShopDatabase } from './database.js';
import { ShopRepository } from './repository.js';

function legacyDatabase(providerAttempts=false) {
  const sqlite=new Database(':memory:');
  let sql=readFileSync(resolve('database/migrations/001_commerce.sql'),'utf8');
  if(!providerAttempts)sql=sql.replace('provider_attempts INTEGER NOT NULL DEFAULT 0,','');
  sqlite.exec(sql);
  return sqliteDatabase(sqlite);
}
async function legacyProduct(db:ShopDatabase,id='legacy-product') {
  await db.query(`INSERT INTO shop_products(id,source,external_id,name,brand,category,gender,color,fabric,fit,pattern,occasion,description,price_minor,mrp_minor,rating,details,inventory_source,created_at)
    VALUES($1,'legacy-feed',$1,'Legacy Tunic','Atlas','Tunics','Women','Neutral','Linen','Regular','Solid','','Legacy weave',10000,20000,NULL,$2,'sample',1)`,[id,JSON.stringify({inventoryVerified:false,materialComposition:'Linen blend',tags:['legacy']})]);
  await db.query("INSERT INTO shop_variants(id,product_id,sku,size,color,stock,price_minor,active) VALUES($1,$2,$1,'S','Blue',2,10000,1)",[id+'-s',id]);
  await db.query("INSERT INTO shop_variants(id,product_id,sku,size,color,stock,price_minor,active) VALUES($1,$2,$1,'XXL','Retired',8,10000,0)",[id+'-old',id]);
}
test('migrations record checksums once and are safe to run concurrently and repeatedly',async()=>{
  const db=sqliteDatabase(new Database(':memory:'));
  try{
    await Promise.all([migrate(db),migrate(db)]);
    const first=(await db.query('SELECT * FROM shop_schema_migrations ORDER BY version')).rows;
    assert.deepEqual(first.map(row=>row.version),[1,3,4]);assert.ok(first.every(row=>/^[a-f0-9]{64}$/.test(row.checksum)));
    await migrate(db);assert.deepEqual((await db.query('SELECT * FROM shop_schema_migrations ORDER BY version')).rows,first);
  }finally{await db.close();}
});
test('unversioned old schema upgrades search and provider attempts while retaining carts, orders and stock',async()=>{
  const db=legacyDatabase();
  try{
    await legacyProduct(db);
    await db.query("INSERT INTO shop_sessions(id,token_hash,csrf_token,admin_until,expires_at,created_at) VALUES('old-session','old-hash','old-csrf',0,9999999999999,1)");
    await db.query("INSERT INTO shop_cart_items(id,session_id,variant_id,quantity,updated_at) VALUES('old-cart','old-session','legacy-product-s',1,1)");
    await db.query("INSERT INTO shop_orders(id,session_id,idempotency_key,request_hash,status,payment_mode,subtotal_minor,shipping_minor,total_minor,currency,address,created_at,reservation_until) VALUES('old-order','old-session','old-key','old-request','awaiting_payment','stripe',10000,0,10000,'INR','{}',1,9999999999999)");
    await db.query("INSERT INTO shop_order_items(order_id,position,variant_id,quantity,unit_price_minor,snapshot) VALUES('old-order',0,'legacy-product-s',1,10000,'{}')");
    const before=(await db.query('SELECT * FROM shop_orders')).rows[0];
    const repository=new ShopRepository(db,'sample');await repository.initialize(false);
    assert.deepEqual((await db.query('SELECT * FROM shop_orders')).rows[0],{...before,provider_attempts:0});
    assert.equal((await repository.cart('old-session')).items[0].quantity,1);
    assert.equal((await repository.product('legacy-product')).stock,2);
    assert.equal((await repository.products({search:'linen blue s'})).total,1);
    assert.equal((await repository.products({search:'xxl retired'})).total,0);
    assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM shop_order_items')).rows[0].n),1);
    assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM shop_variants')).rows[0].n),2);
  }finally{await db.close();}
});
test('current unversioned databases are adopted and search backfill crosses bounded 100-product pages',async()=>{
  const db=legacyDatabase(true);
  try{
    for(let i=0;i<105;i++)await legacyProduct(db,'old-'+String(i).padStart(3,'0'));
    const repository=new ShopRepository(db,'sample');await repository.initialize(false);
    const page=await repository.products({search:'linen blue s',page:2,limit:100});assert.equal(page.total,105);assert.equal(page.data.length,5);
    assert.equal((await repository.products({search:'retired'})).total,0);
    await repository.initialize(false);assert.equal((await repository.summary()).products,105);
  }finally{await db.close();}
});
test('failed schema upgrades roll back both DDL and version records before a safe retry',async()=>{
  const db=legacyDatabase();
  try{
    await legacyProduct(db);
    const interrupted:ShopDatabase={...db,transaction:action=>db.transaction(tx=>action({query:async(sql,values)=>{
      if(sql.startsWith('ALTER TABLE shop_products ADD COLUMN search_attributes'))throw new Error('simulated migration interruption');
      return tx.query(sql,values);
    }}))};
    await assert.rejects(migrate(interrupted),/simulated migration interruption/);
    assert.equal((await db.query("SELECT name FROM sqlite_master WHERE name='shop_schema_migrations'")).rows.length,0);
    assert.ok(!(await db.query('PRAGMA table_info(shop_products)')).rows.some(row=>row.name==='search_primary'));
    assert.ok(!(await db.query('PRAGMA table_info(shop_orders)')).rows.some(row=>row.name==='provider_attempts'));
    await migrate(db);assert.equal((await new ShopRepository(db).products({search:'linen blue s'})).total,1);
  }finally{await db.close();}
});
test('migration drift, unknown future versions and gaps fail closed without replacing stored data',async()=>{
  for(const [sql,message] of [
    ["UPDATE shop_schema_migrations SET checksum='tampered' WHERE version=1",/checksum mismatch/],
    ["INSERT INTO shop_schema_migrations VALUES(999,'future.sql','future',1)",/newer than or incompatible/],
    ['DELETE FROM shop_schema_migrations WHERE version=3',/history has gaps/],
  ] as const){
    const db=legacyDatabase();
    try{await legacyProduct(db);await migrate(db);await db.query(sql);await assert.rejects(migrate(db),message);assert.equal((await db.query('SELECT stock FROM shop_variants WHERE active=1')).rows[0].stock,2);}
    finally{await db.close();}
  }
});
