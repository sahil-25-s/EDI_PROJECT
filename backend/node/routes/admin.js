const express = require('express');
const { db } = require('../database');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'codecade_secret_key';

// Admin middleware
const adminAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        db.get('SELECT * FROM users WHERE id = ? AND role = ?', [decoded.userId, 'admin'], (err, user) => {
            if (err || !user) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Delete user (admin only)
router.delete('/users/:userId', adminAuth, (req, res) => {
    const userId = req.params.userId;
    
    if (userId == req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    
    db.run('DELETE FROM users WHERE id = ? AND role != ?', [userId, 'admin'], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found or cannot delete admin' });
        }
        res.json({ message: 'User deleted successfully' });
    });
});

// Update user role (admin only)
router.put('/users/:userId/role', adminAuth, (req, res) => {
    const userId = req.params.userId;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    
    if (userId == req.user.id && role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change your own admin role' });
    }
    
    db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User role updated successfully' });
    });
});

// Get all users
router.get('/users', adminAuth, (req, res) => {
    db.all('SELECT id, username, email, role, level, xp, battle_rating, battle_wins, battle_losses, created_at FROM users ORDER BY created_at DESC', (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(users);
    });
});

// Get user's submitted codes
router.get('/users/:userId/codes', adminAuth, (req, res) => {
    const userId = req.params.userId;
    
    db.all(`SELECT sp.*, u.username 
            FROM solved_problems sp 
            JOIN users u ON sp.user_id = u.id 
            WHERE sp.user_id = ? 
            ORDER BY sp.solved_at DESC`, [userId], (err, codes) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(codes);
    });
});

// Get all submitted codes
router.get('/codes', adminAuth, (req, res) => {
    db.all(`SELECT sp.*, u.username 
            FROM solved_problems sp 
            JOIN users u ON sp.user_id = u.id 
            ORDER BY sp.solved_at DESC`, (err, codes) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(codes);
    });
});

// Get platform statistics
router.get('/stats', adminAuth, (req, res) => {
    const stats = {};
    
    // Get user count
    db.get('SELECT COUNT(*) as count FROM users WHERE role != ?', ['admin'], (err, userCount) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.totalUsers = userCount.count;
        
        // Get problem submissions count
        db.get('SELECT COUNT(*) as count FROM solved_problems', (err, submissionCount) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            stats.totalSubmissions = submissionCount.count;
            
            // Get battles count
            db.get('SELECT COUNT(*) as count FROM battles', (err, battleCount) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                stats.totalBattles = battleCount.count;
                
                // Get active users (logged in last 7 days)
                db.get('SELECT COUNT(*) as count FROM users WHERE created_at > datetime("now", "-7 days") AND role != ?', ['admin'], (err, activeUsers) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    stats.activeUsers = activeUsers.count;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// Clear all user data (admin only)
router.delete('/clear-data', adminAuth, (req, res) => {
    db.serialize(() => {
        db.run('DELETE FROM solved_problems');
        db.run('DELETE FROM completed_lessons');
        db.run('DELETE FROM battles');
        db.run('DELETE FROM users WHERE role != ?', ['admin'], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'All user data cleared successfully' });
        });
    });
});

// Award points to user for code submission
router.post('/award-points', adminAuth, (req, res) => {
    const { userId, submissionId, points } = req.body;
    
    if (!userId || !points || points < 0 || points > 100) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }
    
    // Update user XP
    db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [points, userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update user level based on XP
        db.get('SELECT xp FROM users WHERE id = ?', [userId], (err, user) => {
            if (user) {
                const newLevel = Math.floor(user.xp / 100) + 1;
                db.run('UPDATE users SET level = ? WHERE id = ?', [newLevel, userId]);
            }
        });
        
        res.json({ message: `Successfully awarded ${points} points` });
    });
});

// Get system info
router.get('/system', adminAuth, (req, res) => {
    const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    };
    res.json(systemInfo);
});

module.exports = router;