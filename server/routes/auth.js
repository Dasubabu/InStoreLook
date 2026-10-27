const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const SECRET_KEY = 'supersecretkey'; // In prod, use env var

// Register
router.post('/register', (req, res) => {
    const { mobile, password, role } = req.body;
    if (!mobile || !password || !role) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    const stmt = db.prepare('INSERT INTO users (mobile, password, role) VALUES (?, ?, ?)');
    stmt.run(mobile, password, role, function (err) {
        if (err) {
            return res.status(400).json({ error: 'User already exists or other error' });
        }
        const token = jwt.sign({ id: this.lastID, role }, SECRET_KEY);
        res.json({ message: 'User created', token, user: { id: this.lastID, role } });
    });
    stmt.finalize();
});

// Login
router.post('/login', (req, res) => {
    const { mobile, password } = req.body;
    db.get('SELECT * FROM users WHERE mobile = ? AND password = ?', [mobile, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: row.id, role: row.role }, SECRET_KEY);
        res.json({ 
            message: 'Logged in', 
            token, 
            user: { 
                id: row.id, 
                role: row.role, 
                shop_id: row.shop_id,
                mobile: row.mobile 
            } 
        });
    });
});

module.exports = router;
