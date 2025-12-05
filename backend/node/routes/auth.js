const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../database');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, college } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ error: 'User already exists' });
            }

            try {
                const passwordHash = await bcrypt.hash(password, 10);
                
                db.run(`INSERT INTO users (username, email, password_hash, college) VALUES (?, ?, ?, ?)`,
                    [username, email, passwordHash, college || ''], function(err) {
                        if (err) {
                            console.error('Error creating user:', err);
                            return res.status(500).json({ error: 'Failed to create user' });
                        }

                        const token = jwt.sign(
                            { userId: this.lastID, email },
                            process.env.JWT_SECRET,
                            { expiresIn: '24h' }
                        );

                        res.status(201).json({
                            message: 'User created successfully',
                            token,
                            user: {
                                id: this.lastID,
                                username,
                                email,
                                college: college || ''
                            }
                        });
                    });
            } catch (error) {
                console.error('Error hashing password:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            try {
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const token = jwt.sign(
                    { userId: user.id, email: user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    message: 'Login successful',
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        level: user.level,
                        xp: user.xp,
                        college: user.college
                    }
                });
            } catch (error) {
                console.error('Password comparison error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;