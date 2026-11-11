import test from 'node:test';
import Database from 'better-sqlite3';
import { sqliteDatabase } from './database.js';
import { ShopRepository } from './repository.js';
import { catalogChecks, catalogFixtures } from './testing/catalog-fixtures.js';

for(const check of catalogChecks)test('SQLite catalog: '+check.name,async()=>{
  const db=sqliteDatabase(new Database(':memory:')),repository=new ShopRepository(db,'sample');
  try{await repository.initialize(false);await repository.importProducts('catalog-test',catalogFixtures());await check.run(repository);}
  finally{await db.close();}
});
