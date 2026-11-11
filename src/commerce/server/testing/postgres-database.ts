import { randomUUID } from 'node:crypto';
import { Pool, type PoolConfig } from 'pg';
import { postgresDatabase, type ShopDatabase } from '../database.js';

/** Opt-in only. Never loads dotenv, SHOP_DATABASE_URL, PG* credentials, or a
 * public schema. Both the local database and login must have a test-only name. */
export function postgresTestConfig(env:NodeJS.ProcessEnv):PoolConfig|undefined {
  if(!env.SHOP_TEST_DATABASE_URL)return undefined;
  const fail=()=>{throw new Error('PostgreSQL tests require SHOP_TEST_DATABASE_ALLOW=isolated-schema-only and a loopback URL with explicit shop_test_* database/login and no query/fragment');};
  if(env.SHOP_TEST_DATABASE_ALLOW!=='isolated-schema-only')return fail();
  let url:URL;
  try{url=new URL(env.SHOP_TEST_DATABASE_URL);}catch{return fail();}
  let user:string,password:string,database:string;
  try{user=decodeURIComponent(url.username);password=decodeURIComponent(url.password);database=decodeURIComponent(url.pathname.slice(1));}catch{return fail();}
  if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.search||url.hash||
    !/^shop_test_[a-z0-9_]+$/.test(database)||!/^shop_test_[a-z0-9_]+$/.test(user))return fail();
  return {host:url.hostname.replace(/^\[|\]$/g,''),port:Number(url.port||5432),user,database,
    // A callback also prevents node-postgres falling back to PGPASSWORD/pgpass
    // when an explicitly passwordless local test URL is used.
    password:()=>password,ssl:false,options:'-c search_path=pg_catalog',application_name:'shop_catalog_test',
    max:4,connectionTimeoutMillis:3000,idleTimeoutMillis:1000,statement_timeout:10000,lock_timeout:5000};
}
export async function withPostgresTestDatabase(action:(db:ShopDatabase)=>Promise<void>) {
  const config=postgresTestConfig(process.env);
  if(!config)throw new Error('Dedicated PostgreSQL test URL is not configured');
  const admin=new Pool(config),schema='shop_catalog_test_'+randomUUID().replace(/-/g,'');
  let created=false,db:ShopDatabase|undefined;
  try{
    const actual=(await admin.query('SELECT current_database() AS name')).rows[0].name;
    if(actual!==config.database)throw new Error('PostgreSQL test database identity mismatch');
    await admin.query(`CREATE SCHEMA "${schema}"`);created=true;
    db=postgresDatabase(new Pool({...config,options:`-c search_path=${schema},pg_catalog`}));
    const current=(await db.query('SELECT current_schema() AS name')).rows[0].name;
    if(current!==schema)throw new Error('PostgreSQL test schema isolation failed');
    await action(db);
  }finally{
    try{await db?.close();}finally{
      try{if(created)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{await admin.end();}
    }
  }
}
