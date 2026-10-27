const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all shops (with optional search)
router.get('/', (req, res) => {
    const { search } = req.query;
    let query = 'SELECT * FROM shops';
    let params = [];

    if (search) {
        query += ' WHERE name LIKE ? OR address LIKE ? OR description LIKE ?';
        params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ shops: rows });
    });
});

// Create Shop
router.post('/', (req, res) => {
    const { owner_id, name, address, latitude, longitude, description } = req.body;
    const stmt = db.prepare('INSERT INTO shops (owner_id, name, address, latitude, longitude, description) VALUES (?, ?, ?, ?, ?, ?)');

    stmt.run(owner_id, name, address, latitude, longitude, description, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Update user with shop_id
        db.run('UPDATE users SET shop_id = ? WHERE id = ?', [this.lastID, owner_id]);

        res.json({ message: 'Shop created', shopId: this.lastID });
    });
    stmt.finalize();
});

module.exports = router;
