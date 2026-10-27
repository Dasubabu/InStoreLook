
import { Shop, Product } from '../constants/types';

export const initLocalDb = async (): Promise<void> => {
    // No-op for localStorage
    console.log("Initializing Web Local Storage");
};

export const saveShopsToLocal = async (shops: Shop[]): Promise<void> => {
    try {
        const existing = JSON.parse(localStorage.getItem('shops') || '[]') as Shop[];
        const map = new Map(existing.map(s => [s.id, s]));
        shops.forEach(s => map.set(s.id, s));
        localStorage.setItem('shops', JSON.stringify(Array.from(map.values())));
    } catch (e) {
        console.error("Web storage error", e);
    }
};

export const getShopsFromLocal = async (search = ''): Promise<Shop[]> => {
    try {
        const shops = JSON.parse(localStorage.getItem('shops') || '[]') as Shop[];
        if (search) {
            return shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
        }
        return shops;
    } catch (e) {
        return [];
    }
};

export const saveProductsToLocal = async (products: Product[]): Promise<void> => {
    try {
        const existing = JSON.parse(localStorage.getItem('products') || '[]') as Product[];
        const map = new Map(existing.map(p => [p.id, p]));
        products.forEach(p => map.set(p.id, p));
        localStorage.setItem('products', JSON.stringify(Array.from(map.values())));
    } catch (e) {
        console.error("Web storage error", e);
    }
};

export const getProductsFromLocal = async (search = '', shopId?: number | null): Promise<Product[]> => {
    try {
        let products = JSON.parse(localStorage.getItem('products') || '[]') as Product[];
        if (shopId) {
            products = products.filter(p => p.shop_id === shopId);
        }
        if (search) {
            products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        }
        return products;
    } catch (e) {
        return [];
    }
};
