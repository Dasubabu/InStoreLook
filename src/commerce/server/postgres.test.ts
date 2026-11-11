import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ShopRepository } from './repository.js';
import { catalogChecks, catalogFixtures } from './testing/catalog-fixtures.js';
import { postgresTestConfig, withPostgresTestDatabase } from './testing/postgres-database.js';

const consent='isolated-schema-only';
test('PostgreSQL test guard refuses normal credentials, nonlocal URLs, defaults and unsafe connection options',()=>{
  assert.equal(postgresTestConfig({SHOP_DATABASE_URL:'postgres://normal/production'}),undefined);
  const valid='postgresql://shop_test_runner:fake@127.0.0.1:5432/shop_test_catalog';
  for(const [url,allow] of [
    [valid,undefined],[valid,'true'],['postgres://shop_test_runner@remote.example.test/shop_test_catalog',consent],
    ['postgres://shop_test_runner@localhost/production',consent],['postgres://postgres@localhost/shop_test_catalog',consent],
    ['postgres://localhost/shop_test_catalog',consent],[valid+'?options=-csearch_path=public',consent],
    [valid+'?host=remote.example.test',consent],[valid+'#fragment',consent],['invalid url',consent],
  ])assert.throws(()=>postgresTestConfig({SHOP_TEST_DATABASE_URL:url,SHOP_TEST_DATABASE_ALLOW:allow}),/PostgreSQL tests require/);
  const config=postgresTestConfig({SHOP_TEST_DATABASE_URL:valid,SHOP_TEST_DATABASE_ALLOW:consent});
  assert.equal(config?.database,'shop_test_catalog');assert.equal(config?.user,'shop_test_runner');assert.equal(config?.options,'-c search_path=pg_catalog');
});
const enabled=!!process.env.SHOP_TEST_DATABASE_URL&&process.env.SHOP_TEST_DATABASE_ALLOW===consent;
const integration={skip:enabled?false:'Set dedicated loopback SHOP_TEST_DATABASE_URL (shop_test_* database/login) and SHOP_TEST_DATABASE_ALLOW=isolated-schema-only; .env is never read',timeout:60000};
test('PostgreSQL integration: the same catalog regressions, persisted migrations and usable GIN search index',integration,async t=>{
  await withPostgresTestDatabase(async db=>{
    const repository=new ShopRepository(db,'sample');
    await Promise.all([repository.initialize(false),repository.initialize(false)]);
    const before=(await db.query('SELECT * FROM shop_schema_migrations ORDER BY version')).rows;
    assert.deepEqual(before.map(row=>Number(row.version)),[1,2,3,4,5]);
    await repository.initialize(false);assert.deepEqual((await db.query('SELECT * FROM shop_schema_migrations ORDER BY version')).rows,before);
    await repository.importProducts('catalog-test',catalogFixtures());
    for(const check of catalogChecks)await t.test(check.name,()=>check.run(repository));
    await db.transaction(async tx=>{
      // Tiny fixture sets legitimately prefer a sequential scan. This verifies
      // index usability, not a production plan or a performance claim.
      await tx.query('SET LOCAL enable_seqscan=off');
      const plan=(await tx.query('EXPLAIN (FORMAT JSON) SELECT id FROM shop_products WHERE search_document @@ $1::tsquery',["'linen' & 'blue'"])).rows;
      assert.match(JSON.stringify(plan),/shop_product_search_gin/);
    });
  });
});
test('PostgreSQL integration: existing unversioned schema and old search index upgrade without losing stock',integration,async()=>{
  await withPostgresTestDatabase(async db=>{
    for(const file of ['001_commerce.sql','002_postgres_search.sql']){
      const sql=readFileSync(resolve('database/migrations',file),'utf8').replace('provider_attempts INTEGER NOT NULL DEFAULT 0,','').replace(/^--.*$/gm,'');
      for(const statement of sql.split(';').map(value=>value.trim()).filter(Boolean))await db.query(statement);
    }
    await db.query("INSERT INTO shop_products(id,source,external_id,name,brand,category,gender,color,fabric,fit,pattern,occasion,description,price_minor,mrp_minor,rating,details,inventory_source,created_at) VALUES('old','old-feed','old','Old Tunic','Atlas','Tunics','Women','Neutral','Linen','','','','Legacy weave',10000,20000,NULL,'{}','sample',1)");
    await db.query("INSERT INTO shop_variants(id,product_id,sku,size,color,stock,price_minor,active) VALUES('old-s','old','OLD-S','S','Blue',3,10000,1)");
    const repository=new ShopRepository(db,'sample');await repository.initialize(false);
    assert.equal((await repository.products({search:'linen blue s'})).total,1);assert.equal((await repository.product('old')).stock,3);
    const column=(await db.query("SELECT column_default FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='shop_orders' AND column_name='provider_attempts'")).rows;
    assert.equal(column.length,1);
  });
});
