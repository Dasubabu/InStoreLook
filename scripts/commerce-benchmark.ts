import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { sqliteDatabase } from '../src/commerce/server/database.js';
import { ShopRepository } from '../src/commerce/server/repository.js';
import type { ShopProduct, ShopQuery } from '../src/commerce/contracts.js';
import { importNdjson } from './catalog-import.js';

export interface BenchmarkOptions {
  products:number;requests:number;concurrency:number;limit:number;batchSize:number;repeats:number;timeoutMs:number;
}
const bounds:Record<keyof BenchmarkOptions,[number,number,number]>={
  products:[5000,1,100000],requests:[120,4,10000],concurrency:[8,1,32],limit:[24,1,100],
  batchSize:[100,1,100],repeats:[3,1,10],timeoutMs:[120000,1000,600000],
};
const flags:Record<string,keyof BenchmarkOptions>={'--products':'products','--requests':'requests','--concurrency':'concurrency','--limit':'limit','--batch-size':'batchSize','--repeats':'repeats','--timeout-ms':'timeoutMs'};
export function benchmarkOptions(args:string[]):BenchmarkOptions {
  const result=Object.fromEntries(Object.entries(bounds).map(([key,[value]])=>[key,value])) as unknown as BenchmarkOptions;
  const seen=new Set<string>();
  for(let i=0;i<args.length;i+=2){
    const key=flags[args[i]],raw=args[i+1];
    if(!key||seen.has(key)||!raw||!/^\d+$/.test(raw))throw new Error('Invalid benchmark arguments; use --help');
    const value=Number(raw),[,min,max]=bounds[key];
    if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`${args[i]} must be between ${min} and ${max}`);
    result[key]=value;seen.add(key);
  }
  return result;
}
export function syntheticProduct(index:number):ShopProduct {
  const id=`bench-${String(index).padStart(6,'0')}`,priceMinor=90000+(index%200)*100;
  const colors=['Blue','Red','Black','Green'];
  const variants=['S','M','L'].map((size,v)=>({id:`${id}-${size}`,sku:`${id}-${size}`,size,color:colors[(index+v)%colors.length],stock:index%7===0?0:5+v,priceMinor}));
  return {id,name:`Synthetic ${['Shirt','Top','Trouser','Kurta'][index%4]} ${index}`,brand:`Synthetic Brand ${index%20}`,
    category:['Shirts','Tops','Trousers','Kurtas'][index%4],gender:'Unisex',price:priceMinor/100,mrp:priceMinor/100*(1+(index%4)/10),currency:'INR',
    stock:variants.reduce((sum,v)=>sum+v.stock,0),status:index%7===0?'Out of Stock':'In Stock',images:[],description:'Synthetic benchmark fixture, not for sale.',
    color:variants[0].color,fabricType:['Cotton','Linen','Viscose','Denim'][index%4],fit:'Regular',pattern:'Solid',
    inventorySource:'sample',inventoryVerified:false,variants};
}
export function percentile(values:number[],fraction:number) {
  if(!values.length)throw new Error('Cannot summarize an empty measurement');
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)];
}
const rounded=(value:number)=>Math.round(value*100)/100;
export async function runBenchmark(options:BenchmarkOptions) {
  // Revalidate programmatic callers too. There is deliberately no database URL,
  // path, dotenv, openDatabase(), or existing-catalog mode in this benchmark.
  const validated=benchmarkOptions(Object.entries(flags).flatMap(([flag,key])=>[flag,String(options[key])]));
  const runs=[];
  for(let repeat=0;repeat<validated.repeats;repeat++){
    const folder=await mkdtemp(join(tmpdir(),'shop-synthetic-benchmark-'));
    let db:ReturnType<typeof sqliteDatabase>|undefined;
    try {
      const sqlite=new Database(join(folder,'benchmark.sqlite'));
      sqlite.pragma('journal_mode = WAL');db=sqliteDatabase(sqlite);
      const repository=new ShopRepository(db,'sample');
      const deadline=performance.now()+validated.timeoutMs;
      const checkTime=()=>{if(performance.now()>deadline)throw new Error('Synthetic benchmark exceeded its per-run time limit');};
      await repository.initialize(false);
      const importStart=performance.now();
      const records=Readable.from((function*(){for(let i=0;i<validated.products;i++){checkTime();yield JSON.stringify(syntheticProduct(i))+'\n';}})());
      const imported=await importNdjson(records,repository,'synthetic-benchmark',{batchSize:validated.batchSize});
      const importMs=performance.now()-importStart;
      const summary=await repository.summary();
      if(imported.imported!==validated.products||summary.products!==validated.products)throw new Error('Synthetic import count mismatch');
      const queries:ShopQuery[]=[{search:'shirt'},{category:'Shirts',sort:'price_asc'},{minPrice:1000,maxPrice:2500},{search:'synthetic',sort:'discount'}];
      const search=async(index:number)=>{
        checkTime();
        const page=await repository.products({...queries[index%queries.length],limit:validated.limit,page:1});
        if(page.data.length>validated.limit||page.total>validated.products)throw new Error('Unbounded synthetic search result');
        return page.data.length;
      };
      // Warm cache only: fixed query warmup is excluded from latency samples.
      for(let i=0;i<12;i++)await search(i);
      const durations:number[]=[];
      let next=0,returned=0;
      const searchStart=performance.now();
      await Promise.all(Array.from({length:Math.min(validated.concurrency,validated.requests)},async()=>{
        while(next<validated.requests){const index=next++,start=performance.now();const count=await search(index);returned+=count;durations.push(performance.now()-start);}
      }));
      const searchMs=performance.now()-searchStart;
      runs.push({run:repeat+1,products:summary.products,variants:summary.products*3,importMs:rounded(importMs),importProductsPerSecond:rounded(validated.products*1000/importMs),
        requests:durations.length,returned,searchMs:rounded(searchMs),requestsPerSecond:rounded(durations.length*1000/searchMs),p50Ms:rounded(percentile(durations,.5)),p95Ms:rounded(percentile(durations,.95))});
    } finally {try{await db?.close();}finally{await rm(folder,{recursive:true,force:true});}}
  }
  return {adapter:'sqlite',scope:'synthetic temporary SQLite development benchmark; not HTTP, PostgreSQL, production load, or a million-product claim',
    runtime:{node:process.version,platform:process.platform,arch:process.arch},options:validated,cache:'12 warmup queries per fresh database; measured searches are warm',
    workload:'NDJSON generation + validation + committed import; concurrent bounded repository search including SQL count, pagination, and variant/media hydration',
    runs,median:{importProductsPerSecond:percentile(runs.map(r=>r.importProductsPerSecond),.5),p50Ms:percentile(runs.map(r=>r.p50Ms),.5),p95Ms:percentile(runs.map(r=>r.p95Ms),.5)}};
}
async function main(){
  if(process.argv.slice(2).includes('--help')){
    console.log('Temporary synthetic SQLite only. --products 1..100000 (5000), --requests 4..10000 (120), --concurrency 1..32 (8), --limit 1..100 (24), --batch-size 1..100 (100), --repeats 1..10 (3), --timeout-ms 1000..600000 (120000). No existing database is read or changed.');return;
  }
  console.log(JSON.stringify(await runBenchmark(benchmarkOptions(process.argv.slice(2))),null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{
  console.error('Synthetic benchmark failed; check arguments with --help or reduce the sample size/time budget. Temporary data is cleaned up.');process.exitCode=1;
});
