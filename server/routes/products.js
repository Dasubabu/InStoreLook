const express = require('express');
const db = require('../db');
const router = express.Router();

// Get Products (by shop or search)
router.get('/', (req, res) => {
    const { shop_id, search } = req.query;
    let query = 'SELECT * FROM products';
    let params = [];

    if (shop_id) {
        query += ' WHERE shop_id = ?';
        params.push(shop_id);
    } else if (search) {
        query += ' WHERE name LIKE ? OR category LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ products: rows });
    });
});

// Add Product
router.post('/', (req, res) => {
    const { shop_id, name, description, category, price, stock_status, image_url } = req.body;
    const stmt = db.prepare('INSERT INTO products (shop_id, name, description, category, price, stock_status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');

    stmt.run(shop_id, name, description, category, price, stock_status, image_url, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Product added', productId: this.lastID });
    });
    stmt.finalize();
});

// Mock Image Search
router.post('/search-image', (req, res) => {
    // In a real app, this would process the image.
    // Here we return mock results.
    console.log("Image search requested");

    // Return random products from DB or mock data
    db.all('SELECT * FROM products ORDER BY RANDOM() LIMIT 5', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ results: rows });
    });
});

module.exports = router;
