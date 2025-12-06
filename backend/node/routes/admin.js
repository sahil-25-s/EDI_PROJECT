const express = require('express');
const { db } = require('../database');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'codecade_secret_key_2024_secure';

// Verify admin access
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        db.get('SELECT id, role FROM users WHERE id = ?', [decoded.userId], (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }
            res.json({ verified: true, admin: true });
        });
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Admin middleware
const adminAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        console.error('Auth error:', error);
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
60
// Delete user's problem submission
router.delete('/submissions/:id', adminAuth, (req, res) => {
    const submissionId = req.params.id;
    
    db.run('DELETE FROM solved_problems WHERE id = ?', [submissionId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json({ message: 'Submission deleted successfully' });
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
        res.json(codes || []);
    });
});

// Get all submitted codes
router.get('/codes', adminAuth, (req, res) => {
    db.all(`SELECT sp.*, u.username, u.email 
            FROM solved_problems sp 
            JOIN users u ON sp.user_id = u.id 
            ORDER BY sp.solved_at DESC`, (err, codes) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(codes || []);
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

// Approve code submission and award XP
router.post('/approve-code', adminAuth, (req, res) => {
    const { submissionId, userId, xpPoints } = req.body;
    
    if (!submissionId || !userId || !xpPoints) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (xpPoints < 0 || xpPoints > 200) {
        return res.status(400).json({ error: 'XP points must be between 0 and 200' });
    }
    
    db.serialize(() => {
        // Mark submission as approved
        db.run(`UPDATE solved_problems SET approved = 1, admin_xp = ? WHERE id = ?`, 
            [xpPoints, submissionId], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to approve submission' });
                }
                
                // Award XP to user
                db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [xpPoints, userId], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to award XP' });
                    }
                    
                    // Update level
                    db.get('SELECT xp FROM users WHERE id = ?', [userId], (err, user) => {
                        if (user) {
                            const newLevel = Math.floor(user.xp / 100) + 1;
                            db.run('UPDATE users SET level = ? WHERE id = ?', [newLevel, userId]);
                        }
                    });
                    
                    res.json({ 
                        success: true, 
                        message: `Code approved! ${xpPoints} XP awarded to user.` 
                    });
                });
            });
    });
});

// Get pending code submissions for approval
router.get('/pending-codes', adminAuth, (req, res) => {
    db.all(`SELECT sp.*, u.username, u.email 
            FROM solved_problems sp 
            JOIN users u ON sp.user_id = u.id 
            WHERE sp.approved = 0 OR sp.approved IS NULL
            ORDER BY sp.solved_at DESC`, (err, submissions) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(submissions || []);
    });
});

// MCQ Management
router.get('/mcq', adminAuth, (req, res) => {
    db.all('SELECT * FROM mcq_questions ORDER BY created_at DESC', (err, questions) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(questions || []);
    });
});

router.post('/mcq', adminAuth, (req, res) => {
    const { question, options, correct_answer, difficulty } = req.body;
    
    if (!question || !options || correct_answer === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const optionsStr = typeof options === 'string' ? options : JSON.stringify(options);
    
    db.run(`INSERT INTO mcq_questions (question, options, correct_answer, difficulty) VALUES (?, ?, ?, ?)`,
        [question, optionsStr, correct_answer, difficulty || 'medium'], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'MCQ added successfully', id: this.lastID });
        });
});

router.delete('/mcq/:id', adminAuth, (req, res) => {
    const mcqId = req.params.id;
    
    db.run('DELETE FROM mcq_questions WHERE id = ?', [mcqId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'MCQ not found' });
        }
        res.json({ message: 'MCQ deleted successfully' });
    });
});

// Get all problems
router.get('/problems', adminAuth, (req, res) => {
    // Ensure problems table exists
    db.run(`CREATE TABLE IF NOT EXISTS problems (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        input_format TEXT,
        output_format TEXT,
        example TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating problems table:', err);
            return res.status(500).json({ error: 'Database initialization error' });
        }
        
        db.all('SELECT * FROM problems ORDER BY created_at DESC', (err, problems) => {
            if (err) {
                console.error('Error fetching problems:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            res.json(problems || []);
        });
    });
});

// Add new problem
router.post('/problems', adminAuth, (req, res) => {
    const { id, title, description, difficulty, input_format, output_format, example } = req.body;
    
    if (!id || !title || !description || !difficulty) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty level' });
    }
    
    // Ensure problems table exists
    db.run(`CREATE TABLE IF NOT EXISTS problems (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        input_format TEXT,
        output_format TEXT,
        example TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating problems table:', err);
            return res.status(500).json({ error: 'Database initialization error' });
        }
        
        db.run(`INSERT INTO problems (id, title, description, difficulty, input_format, output_format, example) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, title, description, difficulty, input_format || '', output_format || '', example || ''], 
            function(err) {
                if (err) {
                    console.error('Error inserting problem:', err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Problem ID already exists' });
                    }
                    return res.status(500).json({ error: 'Database error: ' + err.message });
                }
                res.json({ message: 'Problem added successfully', id: this.lastID });
            });
    });
});

// Delete problem
router.delete('/problems/:id', adminAuth, (req, res) => {
    const problemId = req.params.id;
    
    db.serialize(() => {
        db.run('DELETE FROM solved_problems WHERE problem_id = ?', [problemId]);
        db.run('DELETE FROM problems WHERE id = ?', [problemId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Problem not found' });
            }
            res.json({ message: 'Problem deleted successfully' });
        });
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