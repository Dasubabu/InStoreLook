import Database from 'better-sqlite3';
import { Pool, type PoolClient } from 'pg';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { catalogSearch } from './catalog-search.js';

export interface QueryResult { rows: any[]; rowCount: number }
export interface Executor { query(sql: string, values?: unknown[]): Promise<QueryResult> }
export interface ShopDatabase extends Executor {
  dialect: 'sqlite' | 'postgres';
  transaction<T>(action: (tx: Executor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// Single connection SQLite transactions must not interleave across await points.
function serialQueue() {
  let tail = Promise.resolve();
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(r => { release = r; });
    await previous;
    try { return await fn(); } finally { release(); }
  };
}
export function sqliteDatabase(sqlite: Database.Database): ShopDatabase {
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const queue = serialQueue();
  const direct: Executor = { async query(sql, values = []) {
    const bound: unknown[] = [];
    const statement = sqlite.prepare(sql.replace(/\$(\d+)/g, (_, n) => { bound.push(values[Number(n) - 1]); return '?'; }));
    if (statement.reader) { const rows = statement.all(...bound); return { rows, rowCount: rows.length }; }
    return { rows: [], rowCount: statement.run(...bound).changes };
  } };
  return {
    dialect: 'sqlite', query: (sql, values) => queue(() => direct.query(sql, values)),
    transaction: action => queue(async () => {
      sqlite.exec('BEGIN IMMEDIATE');
      try { const result = await action(direct); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }),
    async close() { await queue(async () => { sqlite.close(); }); },
  };
}
export function postgresDatabase(pool: Pool): ShopDatabase {
  const executor = (client: Pool | PoolClient): Executor => ({ async query(sql, values = []) {
    const result = await client.query(sql, values); return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } });
  return {
    dialect: 'postgres', ...executor(pool),
    async transaction(action) {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const result = await action(executor(client)); await client.query('COMMIT'); return result; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async close() { await pool.end(); },
  };
}
const migrations=[
  {version:1,name:'001_commerce.sql'},
  {version:2,name:'002_postgres_search.sql',dialect:'postgres'},
  {version:3,name:'003_order_provider_attempts.sql'},
  {version:4,name:'004_catalog_search.sql',dataVersion:'canonical-search-v1'},
  {version:5,name:'005_postgres_catalog_search.sql',dialect:'postgres'},
];
async function backfillCatalogSearch(tx:Executor) {
  let after:string|undefined;
  for(;;){
    const rows=(await tx.query(`SELECT * FROM shop_products${after===undefined?'':' WHERE id>$1'} ORDER BY id LIMIT 100`,after===undefined?[]:[after])).rows;
    if(!rows.length)return;
    const ids=rows.map(row=>row.id),variants=(await tx.query(`SELECT product_id,size,color FROM shop_variants WHERE active=1 AND product_id IN (${ids.map((_,i)=>`$${i+1}`).join(',')})`,ids)).rows;
    const byProduct=new Map<string,any[]>();
    for(const variant of variants){const group=byProduct.get(variant.product_id)||[];group.push(variant);byProduct.set(variant.product_id,group);}
    for(const row of rows){
      const details=JSON.parse(row.details);
      const search=catalogSearch({...row,fabricType:row.fabric,materialComposition:details.materialComposition,tags:details.tags},byProduct.get(row.id)||[]);
      await tx.query('UPDATE shop_products SET search_primary=$1,search_attributes=$2,search_terms=$3 WHERE id=$4',[search.primary,search.attributes,search.terms,row.id]);
    }
    after=rows[rows.length-1].id;
  }
}
export async function migrate(db: ShopDatabase) {
  // Files resolve from project cwd, also when server.ts is bundled into dist/server.cjs.
  // Normalize line endings so a deployment on another OS has the same checksum.
  const applicable=migrations.filter(m=>!m.dialect||m.dialect===db.dialect).map(m=>{
    const sql=readFileSync(resolve('database/migrations',m.name),'utf8').replace(/\r\n/g,'\n');
    return {...m,sql,checksum:createHash('sha256').update(sql+'\n'+(m.dataVersion||'')).digest('hex')};
  });
  await db.transaction(async tx => {
    if (db.dialect === 'postgres') await tx.query('SELECT pg_advisory_xact_lock(72510001)');
    await tx.query('CREATE TABLE IF NOT EXISTS shop_schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,checksum TEXT NOT NULL,applied_at BIGINT NOT NULL)');
    const applied=(await tx.query('SELECT version,name,checksum FROM shop_schema_migrations ORDER BY version')).rows;
    for(const row of applied){
      const migration=applicable.find(m=>m.version===Number(row.version));
      if(!migration)throw new Error('Database migration version is newer than or incompatible with this application');
      if(row.name!==migration.name||row.checksum!==migration.checksum)throw new Error(`Migration checksum mismatch: ${migration.name}`);
    }
    const versions=new Set(applied.map(row=>Number(row.version)));
    let pending=false;
    for(const migration of applicable){
      if(versions.has(migration.version)){if(pending)throw new Error('Database migration history has gaps');continue;}
      pending=true;
    }
    for(const migration of applicable){
      if(versions.has(migration.version))continue;
      let skip=false;
      if(migration.version===3){
        const columns=db.dialect==='sqlite'
          ? (await tx.query('PRAGMA table_info(shop_orders)')).rows.map(row=>row.name)
          : (await tx.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='shop_orders'")).rows.map(row=>row.column_name);
        skip=columns.includes('provider_attempts');
      }
      if(!skip){
        // Migration files contain standalone SQL statements, not stored procedures.
        for(const statement of migration.sql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await tx.query(statement);
      }
      if(migration.version===4)await backfillCatalogSearch(tx);
      await tx.query('INSERT INTO shop_schema_migrations(version,name,checksum,applied_at) VALUES($1,$2,$3,$4)',[migration.version,migration.name,migration.checksum,Date.now()]);
    }
  });
}
export function openDatabase(env: NodeJS.ProcessEnv = process.env): ShopDatabase {
  if (env.SHOP_DATABASE_URL) return postgresDatabase(new Pool({ connectionString: env.SHOP_DATABASE_URL, max: 10, connectionTimeoutMillis:10000, idleTimeoutMillis:30000, statement_timeout:20000 }));
  const production = env.NODE_ENV === 'production' || !!env.VERCEL;
  if (production && !(env.SHOP_ALLOW_LOCAL_DEMO === 'true' && !env.VERCEL && env.SHOP_CATALOG_MODE === 'sample' && env.SHOP_PAYMENT_MODE === 'demo')) {
    throw new Error('SHOP_DATABASE_URL is required in production; SQLite is only available for development or explicit local demos.');
  }
  const path = resolve(env.SHOP_SQLITE_PATH || '.data/shop.sqlite');
  if (path === resolve('sqlite.db')) throw new Error('Commerce cannot use the legacy root sqlite.db');
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  return sqliteDatabase(sqlite);
}
