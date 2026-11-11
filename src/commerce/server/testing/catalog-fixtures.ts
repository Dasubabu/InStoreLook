import assert from 'node:assert/strict';
import type { ShopProduct } from '../../contracts.js';
import type { ShopRepository } from '../repository.js';

export function catalogFixtures():ShopProduct[] {
  const product=(id:string,changes:Partial<ShopProduct>):ShopProduct=>({id,name:'Everyday Tunic',brand:'Atlas',category:'Tunics',gender:'Women',
    price:100,mrp:200,currency:'INR',stock:5,status:'In Stock',images:[],description:'Everyday weave',color:'Neutral',fabricType:'Linen',
    inventorySource:'sample',inventoryVerified:false,variants:[
      {id:id+'-xs',sku:id+'-XS',size:'XS',color:'Blue',stock:0,priceMinor:10000},
      {id:id+'-m',sku:id+'-M',size:'M',color:'Red',stock:5,priceMinor:10000},
      {id:id+'-xl',sku:id+'-XL',size:'XL',color:'Forest Green',stock:0,priceMinor:10000},
    ],...changes});
  return [product('catalog-1',{}),product('catalog-2',{name:'Linen Shirt',brand:'Boreal',category:'Shirts',fabricType:'Cotton',color:'Ivory',description:'Breathable',mrp:125,
    variants:[{id:'catalog-2-m',sku:'catalog-2-M',size:'M',color:'Blue',stock:5,priceMinor:10000},{id:'catalog-2-s',sku:'catalog-2-S',size:'S',color:'Blue',stock:0,priceMinor:10000}]}),
    product('catalog-3',{name:'Tailored Jacket',brand:'Boreal',category:'Jackets',fabricType:'Wool',color:'Black',description:'Includes linen trim',mrp:100,
      variants:[{id:'catalog-3-xl',sku:'catalog-3-XL',size:'XL',color:'Black',stock:0,priceMinor:10000}]}),
    product('catalog-4',{name:'Été कपास Tee',category:'Tees',fabricType:'कपास',color:'Mélange',description:'x'.repeat(2500),mrp:100,
      variants:[{id:'catalog-4-one',sku:'catalog-4-ONE',size:'One Size',color:'Mélange',stock:1,priceMinor:10000}]})];
}
const ids=(products:ShopProduct[])=>products.map(p=>p.id);
export const catalogChecks:{name:string;run:(repository:ShopRepository)=>Promise<void>}[]=[
  {name:'all-token full-text search covers brand, category, title, fabric, color, size and Unicode',async run(repository){
    const cases:[string,string[]][]=[
      ['Atlas Tunics Linen BLUE xs',['catalog-1']],['Linen Cotton',['catalog-2']],['forest-green',['catalog-1']],
      ['red M',['catalog-1']],['XL Black',['catalog-3']],['one size',['catalog-4']],['ÉTÉ कपास',['catalog-4']],['ＣＯＴＴＯＮ',['catalog-2']],
      ['s',['catalog-2']],['shir',[]],['%_',[]],['linen OR wool',[]],['cotton cotton',['catalog-2']],
    ];
    for(const [search,expected] of cases){const result=await repository.products({search});assert.deepEqual(ids(result.data),expected,search);assert.equal(result.total,expected.length,search);}
  }},
  {name:'size, color and availability share an active variant; selected out-of-stock groups are scoped',async run(repository){
    const cases:[Record<string,string>,string[]][]=[
      [{size:'XS',color:'Red'},[]],[{size:'XS',status:'In Stock'},[]],[{size:'M',color:'Blue',status:'In Stock'},['catalog-2']],
      [{size:'M',color:'Red',status:'In Stock'},['catalog-1']],[{size:'S',color:'Blue',status:'Out of Stock'},['catalog-2']],
      [{size:'M',color:'Blue',status:'Out of Stock'},[]],[{size:'L',color:'Blue',status:'Out of Stock'},[]],
      [{size:'XL',color:'Forest Green',status:'Out of Stock'},['catalog-1']],[{status:'Out of Stock'},['catalog-3']],
      [{search:'linen',size:'M',color:'Blue',status:'In Stock'},['catalog-2']],
    ];
    for(const [query,expected] of cases){const result=await repository.products(query);assert.deepEqual(ids(result.data),expected,JSON.stringify(query));}
  }},
  {name:'relevance and discount sorts are deterministic, paginated and server-side',async run(repository){
    assert.deepEqual(ids((await repository.products({search:'linen'})).data),['catalog-2','catalog-1','catalog-3']);
    assert.deepEqual(ids((await repository.products({search:'linen',sort:'relevance'})).data),['catalog-2','catalog-1','catalog-3']);
    for(const [index,id] of ['catalog-2','catalog-1','catalog-3'].entries()){
      const page=await repository.products({search:'linen',sort:'relevance',page:index+1,limit:1});
      assert.deepEqual(ids(page.data),[id]);assert.equal(page.total,3);assert.equal(page.totalPages,3);
    }
    assert.equal((await repository.products({search:'linen',page:4,limit:1})).data.length,0);
    assert.deepEqual(ids((await repository.products({search:'linen',sort:'price_asc'})).data),['catalog-1','catalog-2','catalog-3']);
    for(const sort of ['discount','discount_desc'])assert.deepEqual(ids((await repository.products({sort})).data),['catalog-1','catalog-2','catalog-3','catalog-4']);
    assert.deepEqual(ids((await repository.products({minDiscount:25})).data),['catalog-1']);
    assert.equal((await repository.products({minDiscount:20})).total,2);
    assert.deepEqual(await repository.suggestions('linen'),['Linen Shirt','Everyday Tunic','Tailored Jacket']);
  }},
  {name:'repository callers cannot bypass query bounds or inject search syntax',async run(repository){
    for(const query of [{limit:101},{limit:0},{page:10001},{page:1.5},{search:'a'.repeat(201)},{sort:'DROP TABLE shop_products'}]){
      await assert.rejects(repository.products(query),(error:any)=>error.code==='INVALID_INPUT');
    }
    assert.equal((await repository.products({search:"' OR 1=1; DROP TABLE shop_products;--"})).total,0);
    assert.equal((await repository.summary()).products,4);
    assert.equal((await repository.products({limit:1})).data.length,1);
  }},
  {name:'reimports refresh indexed attributes and remove retired variants from filters and search',async run(repository){
    const changed=catalogFixtures()[0];changed.variants=changed.variants.filter(v=>v.size==='M');changed.fabricType='Silk';
    await repository.importProducts('catalog-test',[changed]);
    assert.equal((await repository.products({search:'forest green'})).total,0);
    assert.equal((await repository.products({search:'xs'})).total,0);
    assert.equal((await repository.products({size:'XS',color:'Blue',status:'Out of Stock'})).total,0);
    assert.deepEqual(ids((await repository.products({search:'silk red m'})).data),['catalog-1']);
    assert.equal(Number((await repository.db.query('SELECT active FROM shop_variants WHERE id=$1',['catalog-1-xs'])).rows[0].active),0);
    const conflict={...changed,fabricType:'Velvet',variants:[{...changed.variants[0],sku:'catalog-2-M'}]};
    await assert.rejects(repository.importProducts('catalog-test',[conflict]));
    assert.equal((await repository.products({search:'velvet'})).total,0);
    assert.equal((await repository.products({search:'silk'})).total,1);
  }},
];
