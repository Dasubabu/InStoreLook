import type { ShopProduct, ShopVariant } from '../contracts.js';

/** Shared, deterministic whole-token semantics for PostgreSQL and the SQLite
 * development fallback. All terms must match; punctuation is a separator, not
 * a query operator. No stemming, wildcard expansion, or language stop words. */
export function searchTokens(value:string):string[] {
  const tokens:string[]=value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu)||[];
  // Queries are capped at 200 characters. Longer document words cannot be
  // queried and are omitted rather than exceeding PostgreSQL lexeme limits.
  return [...new Set(tokens.filter(term=>term.length<=200))];
}
const document=(values:string[])=>{
  const terms=searchTokens(values.join(' '));
  return terms.length?' '+terms.join(' ')+' ':'';
};
type SearchProduct=Pick<ShopProduct,'name'|'brand'|'category'|'description'|'color'|'fabricType'|'materialComposition'|'gender'|'fit'|'pattern'|'occasion'|'tags'>;
export function catalogSearch(product:SearchProduct,variants:Pick<ShopVariant,'size'|'color'>[]) {
  const primary=document([product.name,product.brand,product.category]);
  const attributes=document([product.color,product.fabricType,product.materialComposition,product.gender,product.fit,product.pattern,product.occasion,
    ...variants.flatMap(v=>[v.size,v.color])].filter((value):value is string=>typeof value==='string'));
  const terms=document([primary,attributes,product.description,...(product.tags||[])]);
  return {primary,attributes,terms};
}
export const discountExpression='(CASE WHEN p.mrp_minor>0 THEN 100.0*(p.mrp_minor-p.price_minor)/p.mrp_minor ELSE 0 END)';
