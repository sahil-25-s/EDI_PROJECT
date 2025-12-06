const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.get('SELECT id, username, email, role, level, xp, streak_days, college, battle_rating, battle_wins, battle_losses FROM users WHERE id = ?', 
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
    
    db.get('SELECT xp, level FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        db.get('SELECT COUNT(*) as solved_count FROM solved_problems WHERE user_id = ?', [userId], (err, solvedResult) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            db.get('SELECT COUNT(*) as lessons_count FROM completed_lessons WHERE user_id = ?', [userId], (err, lessonsResult) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                db.all(`SELECT sp.*, p.title, p.difficulty as problem_difficulty 
                        FROM solved_problems sp 
                        LEFT JOIN problems p ON sp.problem_id = p.id 
                        WHERE sp.user_id = ? 
                        ORDER BY sp.solved_at DESC`, [userId], (err, problems) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    // Ensure difficulty field exists
                    const processedProblems = problems.map(p => ({
                        ...p,
                        difficulty: p.difficulty || p.problem_difficulty || 'easy',
                        title: p.title || p.problem_id
                    }));

                    res.json({
                        problemsSolved: solvedResult.solved_count || 0,
                        lessonsCompleted: lessonsResult.lessons_count || 0,
                        currentStreak: 0,
                        totalXP: user?.xp || 0,
                        level: user?.level || 1,
                        totalSolved: solvedResult.solved_count || 0,
                        problems: processedProblems
                    });
                });
            });
        });
    });
});

// Delete user profile
router.delete('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.serialize(() => {
        db.run('DELETE FROM solved_problems WHERE user_id = ?', [userId]);
        db.run('DELETE FROM completed_lessons WHERE user_id = ?', [userId]);
        db.run('DELETE FROM battles WHERE player1_id = ? OR player2_id = ?', [userId, userId]);
        db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete profile' });
            }
            res.json({ message: 'Profile deleted successfully' });
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
        [username, college || '', userId], 
        function(err) {
            if (err) {
                console.error('Error updating user:', err);
                return res.status(500).json({ error: 'Failed to update profile' });
            }
            res.json({ message: 'Profile updated successfully' });
        });
});

module.exports = router;