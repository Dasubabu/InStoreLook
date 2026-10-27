
import { Shop, Product } from '../constants/types';

export declare function initLocalDb(): Promise<void>;
export declare function saveShopsToLocal(shops: Shop[]): Promise<void>;
export declare function getShopsFromLocal(search?: string): Promise<Shop[]>;
export declare function saveProductsToLocal(products: Product[]): Promise<void>;
export declare function getProductsFromLocal(search?: string, shopId?: number | null): Promise<Product[]>;
