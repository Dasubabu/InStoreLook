const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'instorelook.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mobile TEXT UNIQUE,
            password TEXT,
            role TEXT CHECK(role IN ('buyer', 'shopkeeper')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Safe migration: add shop_id column to users if it doesn't exist
        // Use db.all() instead of db.run() for PRAGMA table_info since it returns rows
        db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
            if (err) {
                console.error('Error checking users table columns', err);
                return;
            }
            const hasShopId = columns.some(col => col.name === 'shop_id');
            if (!hasShopId) {
                db.run(`ALTER TABLE users ADD COLUMN shop_id INTEGER`, (alterErr) => {
                    if (alterErr) {
                        console.error('Error adding shop_id column', alterErr);
                    } else {
                        console.log('shop_id column added to users table');
                    }
                });
            }
        });

        // Shops Table
        db.run(`CREATE TABLE IF NOT EXISTS shops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER,
            name TEXT,
            address TEXT,
            latitude REAL,
            longitude REAL,
            description TEXT,
            subscription_level TEXT DEFAULT 'free',
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )`);

        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shop_id INTEGER,
            name TEXT,
            description TEXT,
            category TEXT,
            price REAL,
            stock_status TEXT CHECK(stock_status IN ('Available', 'Limited', 'Out of Stock')),
            image_url TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(shop_id) REFERENCES shops(id)
        )`);

        console.log("Database tables initialized.");
    });
}

module.exports = db;
