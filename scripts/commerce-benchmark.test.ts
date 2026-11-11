import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import Database from 'better-sqlite3';
import { benchmarkOptions, percentile, syntheticProduct } from './commerce-benchmark.js';
import { importNdjson } from './catalog-import.js';
import { ShopRepository } from '../src/commerce/server/repository.js';
import { sqliteDatabase } from '../src/commerce/server/database.js';

test('synthetic benchmark rejects unbounded sizes and any existing database/path argument',()=>{
  for(const args of [['--products','100001'],['--products','0'],['--products','1.5'],['--requests','10001'],['--concurrency','33'],['--limit','101'],['--batch-size','101'],['--repeats','11'],['--timeout-ms','600001'],['--database','anything'],['--path','anything'],['--products','2','--products','3']]){
    assert.throws(()=>benchmarkOptions(args));
  }
  assert.equal(benchmarkOptions(['--products','123']).products,123);
  assert.equal(percentile(Array.from({length:20},(_,i)=>i+1),.95),19);
  const product=syntheticProduct(4);assert.equal(product.inventorySource,'sample');assert.equal(product.inventoryVerified,false);assert.deepEqual(product.images,[]);
});
test('benchmark CLI measures import and concurrent bounded searches while ignoring configured user DBs',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'shop-benchmark-test-')),sentinel=join(folder,'must-not-be-created.sqlite');
  try{
    const {stdout}=await promisify(execFile)(process.execPath,['--import','tsx','scripts/commerce-benchmark.ts','--products','101','--requests','8','--concurrency','4','--limit','7','--repeats','1'],{
      env:{...process.env,SHOP_DATABASE_URL:'postgresql://do-not-connect.invalid/do-not-connect',SHOP_SQLITE_PATH:sentinel},timeout:30000,maxBuffer:1024*1024,
    });
    const result=JSON.parse(stdout),run=result.runs[0];
    assert.equal(result.adapter,'sqlite');assert.match(result.scope,/synthetic temporary/);assert.equal(result.options.concurrency,4);
    assert.equal(run.products,101);assert.equal(run.variants,303);assert.equal(run.requests,8);assert.equal(run.returned,44);
    assert.ok(run.importProductsPerSecond>0);assert.ok(run.p50Ms>0);assert.ok(run.p95Ms>=run.p50Ms);
    await assert.rejects(access(sentinel),(error:any)=>error.code==='ENOENT');
  }finally{await rm(folder,{recursive:true,force:true});}
});
test('streamed ingestion commits bounded batches, decodes split UTF-8 and retains only completed batches on error',async()=>{
  const db=sqliteDatabase(new Database(':memory:')),repository=new ShopRepository(db,'sample');
  try{
    await repository.initialize(false);
    const first={...syntheticProduct(1),name:'Été कपास'},bytes=Buffer.from(JSON.stringify(first)+'\r\n');
    const chunks=Array.from(bytes,value=>Buffer.from([value]));
    assert.equal((await importNdjson(Readable.from(chunks),repository,'utf8',{batchSize:1})).imported,1);
    assert.equal((await repository.product(first.id)).name,first.name);
    const good=[2,3,4].map(index=>JSON.stringify(syntheticProduct(index))).join('\n');
    await assert.rejects(importNdjson(Readable.from([good+'\n{bad json}\n']),repository,'partial',{batchSize:2}),/Invalid JSON on line 4/);
    assert.equal((await repository.summary()).products,3);await assert.rejects(repository.product('bench-000004'));
    await assert.rejects(importNdjson(Readable.from(['x'.repeat(1024*1024),'x']),repository,'oversize'),/exceeds 1 MiB/);
    await assert.rejects(importNdjson(Readable.from([]),repository,'invalid',{batchSize:101}));
  }finally{await db.close();}
});
test('streamed ingestion flushes its byte budget before accumulating 100 large lines',async()=>{
  const db=sqliteDatabase(new Database(':memory:')),repository=new ShopRepository(db,'sample');
  try{
    await repository.initialize(false);
    const sizes:number[]=[],original=repository.importProducts.bind(repository);
    repository.importProducts=async(source,values)=>{sizes.push(values.length);return original(source,values);};
    const stream=Readable.from((function*(){for(let i=0;i<6;i++)yield JSON.stringify({...syntheticProduct(i),ignoredPadding:'x'.repeat(900000)})+'\n';})());
    assert.equal((await importNdjson(stream,repository,'large-lines')).imported,6);
    assert.deepEqual(sizes,[4,2]);assert.equal((await repository.summary()).products,6);
  }finally{await db.close();}
});
