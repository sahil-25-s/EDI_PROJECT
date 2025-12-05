const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.get('SELECT id, username, email, level, xp, streak_days, college, battle_rating, battle_wins, battle_losses FROM users WHERE id = ?', 
        [userId], (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        });
});

// Get user stats
router.get('/stats', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    // Get user info with XP and level
    db.get('SELECT xp, level FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Get solved problems count
        db.get('SELECT COUNT(*) as solved_count FROM solved_problems WHERE user_id = ?', [userId], (err, solvedResult) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Get completed lessons count
            db.get('SELECT COUNT(*) as lessons_count FROM completed_lessons WHERE user_id = ?', [userId], (err, lessonsResult) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    problemsSolved: solvedResult.solved_count || 0,
                    lessonsCompleted: lessonsResult.lessons_count || 0,
                    currentStreak: 0,
                    totalXP: user?.xp || 0,
                    level: user?.level || 1
                });
            });
        });
    });
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { username, college } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    db.run('UPDATE users SET username = ?, college = ? WHERE id = ?', 
        [username, college || '', userId], function(err) {
            if (err) {
                console.error('Error updating user:', err);
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            res.json({ message: 'Profile updated successfully' });
        });
});

module.exports = router;