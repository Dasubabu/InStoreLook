
import * as SQLite from 'expo-sqlite';
import { Shop, Product } from '../constants/types';

let db: SQLite.SQLiteDatabase | undefined;

export const initLocalDb = async (): Promise<void> => {
    db = await SQLite.openDatabaseAsync('instorelook.db');
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS shops (id INTEGER PRIMARY KEY, name TEXT, address TEXT, description TEXT, latitude REAL, longitude REAL, json_data TEXT);
    CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, shop_id INTEGER, name TEXT, price REAL, stock_status TEXT, json_data TEXT);
  `);
};

export const saveShopsToLocal = async (shops: Shop[]): Promise<void> => {
    if (!db) await initLocalDb();
    if (!db) return;
    for (const shop of shops) {
        await db.runAsync(
            'INSERT OR REPLACE INTO shops (id, name, address, description, latitude, longitude, json_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [shop.id, shop.name, shop.address, shop.description || '', shop.latitude, shop.longitude, JSON.stringify(shop)]
        );
    }
};

export const getShopsFromLocal = async (search = ''): Promise<Shop[]> => {
    if (!db) await initLocalDb();
    if (!db) return [];
    let query = 'SELECT json_data FROM shops';
    let params: (string | number)[] = [];
    if (search) {
        query += ' WHERE name LIKE ?';
        params.push(`%${search}%`);
    }
    const result = await db.getAllAsync<{ json_data: string }>(query, params);
    return result.map(row => JSON.parse(row.json_data) as Shop);
};

export const saveProductsToLocal = async (products: Product[]): Promise<void> => {
    if (!db) await initLocalDb();
    if (!db) return;
    for (const p of products) {
        await db.runAsync(
            'INSERT OR REPLACE INTO products (id, shop_id, name, price, stock_status, json_data) VALUES (?, ?, ?, ?, ?, ?)',
            [p.id, p.shop_id, p.name, p.price, p.stock_status, JSON.stringify(p)]
        );
    }
};

export const getProductsFromLocal = async (search = '', shopId?: number | null): Promise<Product[]> => {
    if (!db) await initLocalDb();
    if (!db) return [];
    let query = 'SELECT json_data FROM products';
    // Logic for filtering by params locally is simplified here
    const result = await db.getAllAsync<{ json_data: string }>(query);
    let items = result.map(row => JSON.parse(row.json_data) as Product);

    if (shopId) {
        items = items.filter(i => i.shop_id === shopId);
    }
    if (search) {
        items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    }
    return items;
};
