import { createReadStream } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Readable } from 'node:stream';
import { openDatabase } from '../src/commerce/server/database.js';
import { ShopRepository } from '../src/commerce/server/repository.js';
import { integer, ShopError, text } from '../src/commerce/server/validation.js';

const MAX_LINE_BYTES=1024*1024;
const MAX_BATCH_BYTES=4*1024*1024;

/** One authorized ShopProduct JSON object per line. Memory is bounded by line and batch limits. */
export async function importNdjson(stream:Readable,repository:ShopRepository,source:string,options:{batchSize?:number}={}) {
  source=text(source,'feed source',120);
  const batchSize=integer(options.batchSize??100,'batch size',1,100);
  let pending='',pendingBytes=0,batch:unknown[]=[],batchBytes=0,imported=0,line=0;
  const flush=async()=>{
    if(batch.length)imported+=(await repository.importProducts(source,batch)).imported;
    batch=[];batchBytes=0;
  };
  const consume=async(value:string)=>{
    line++;
    if(!value.trim())return;
    const bytes=Buffer.byteLength(value);
    if(bytes>MAX_LINE_BYTES)throw new Error(`Line ${line} exceeds 1 MiB`);
    if(batchBytes+bytes>MAX_BATCH_BYTES)await flush();
    try {batch.push(JSON.parse(value));}catch{throw new Error(`Invalid JSON on line ${line}`);}
    batchBytes+=bytes;
    if(batch.length===batchSize)await flush();
  };
  stream.setEncoding('utf8');
  for await(const chunk of stream){
    const value=String(chunk);
    let start=0;
    while(start<value.length){
      const end=value.indexOf('\n',start),part=value.slice(start,end<0?undefined:end);
      pendingBytes+=Buffer.byteLength(part);
      if(pendingBytes>MAX_LINE_BYTES)throw new Error(`Line ${line+1} exceeds 1 MiB`);
      pending+=part;
      if(end<0)break;
      await consume(pending);pending='';pendingBytes=0;start=end+1;
    }
  }
  if(pending)await consume(pending);
  await flush();
  return {imported};
}
async function main(){
  const args=process.argv.slice(2);
  let authorized=false,source:string|undefined,file:string|undefined;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--authorized'&&!authorized)authorized=true;
    else if(args[i]==='--source'&&!source)source=args[++i];
    else if(!args[i].startsWith('--')&&!file)file=args[i];
    else throw new Error('Invalid import arguments');
  }
  if(!authorized||!source||source.startsWith('--')||!file)throw new Error('Usage: node --import tsx scripts/catalog-import.ts --authorized --source FEED path.ndjson');
  // Only the explicitly authorized CLI loads configuration. Importing the stream
  // helper from tests or the synthetic benchmark never reads .env or opens a DB.
  await import('dotenv/config');
  const db=openDatabase();
  try{
    const repository=new ShopRepository(db,process.env.SHOP_CATALOG_MODE==='sample'?'sample':'live');
    await repository.initialize(false);
    const result=await importNdjson(createReadStream(file),repository,source);
    console.log(JSON.stringify(result));
  }finally{await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
  // Validation errors are generic and contain no feed/customer payloads or credentials.
  console.error(error instanceof ShopError?error.message:'Catalog import failed. Check file format, authorization flag, and database configuration. Completed batches remain committed.');
  process.exitCode=1;
});
