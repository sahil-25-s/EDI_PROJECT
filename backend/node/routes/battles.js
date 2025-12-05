const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get battle queue (find opponents)
router.get('/queue', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    // Find available battles or create new one
    db.get(`SELECT b.*, u.username as opponent_username 
            FROM battles b 
            JOIN users u ON (u.id = b.player1_id OR u.id = b.player2_id) AND u.id != ?
            WHERE b.status = 'waiting' AND (b.player1_id != ? AND b.player2_id IS NULL)
            ORDER BY b.created_at ASC LIMIT 1`, [userId, userId], (err, battle) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (battle) {
            // Join existing battle
            db.run('UPDATE battles SET player2_id = ?, status = ? WHERE id = ?', 
                [userId, 'active', battle.id], (err) => {
                    if (err) {
                        console.error('Error joining battle:', err);
                        return res.status(500).json({ error: 'Failed to join battle' });
                    }

                    res.json({
                        battleId: battle.id,
                        opponent: battle.opponent_username,
                        status: 'active',
                        problemId: battle.problem_id
                    });
                });
        } else {
            // Create new battle
            const problemIds = ['two-sum', 'reverse-string', 'palindrome-number', 'valid-parentheses'];
            const randomProblem = problemIds[Math.floor(Math.random() * problemIds.length)];
            
            db.run(`INSERT INTO battles (player1_id, problem_id, status) VALUES (?, ?, ?)`,
                [userId, randomProblem, 'waiting'], function(err) {
                    if (err) {
                        console.error('Error creating battle:', err);
                        return res.status(500).json({ error: 'Failed to create battle' });
                    }

                    res.json({
                        battleId: this.lastID,
                        status: 'waiting',
                        problemId: randomProblem,
                        message: 'Waiting for opponent...'
                    });
                });
        }
    });
});

// Submit battle solution
router.post('/:id/submit', authenticateToken, (req, res) => {
    const battleId = req.params.id;
    const userId = req.user.userId;
    const { solution, timeElapsed } = req.body;

    if (!solution) {
        return res.status(400).json({ error: 'Solution is required' });
    }

    // Get battle info
    db.get('SELECT * FROM battles WHERE id = ? AND (player1_id = ? OR player2_id = ?)', 
        [battleId, userId, userId], (err, battle) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!battle) {
                return res.status(404).json({ error: 'Battle not found' });
            }

            // Simple solution validation
            const isCorrect = solution.length > 20 && 
                             (solution.includes('return') || solution.includes('print'));

            if (isCorrect && battle.status === 'active') {
                // Winner found
                db.run('UPDATE battles SET winner_id = ?, status = ? WHERE id = ?', 
                    [userId, 'completed', battleId], (err) => {
                        if (err) {
                            console.error('Error updating battle:', err);
                            return res.status(500).json({ error: 'Failed to update battle' });
                        }

                        // Update battle stats
                        const opponentId = battle.player1_id === userId ? battle.player2_id : battle.player1_id;
                        
                        // Update winner
                        db.run('UPDATE users SET battle_wins = battle_wins + 1, battle_rating = battle_rating + 25, xp = xp + 100 WHERE id = ?', 
                            [userId]);
                        
                        // Update loser
                        if (opponentId) {
                            db.run('UPDATE users SET battle_losses = battle_losses + 1, battle_rating = MAX(1000, battle_rating - 15) WHERE id = ?', 
                                [opponentId]);
                        }

                        res.json({
                            success: true,
                            result: 'victory',
                            message: 'You won! +100 XP, +25 Rating',
                            xpGained: 100
                        });
                    });
            } else {
                res.json({
                    success: false,
                    message: 'Solution incorrect. Keep trying!',
                    timeElapsed
                });
            }
        });
});

// Get battle history
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.all(`SELECT b.*, 
                   u1.username as player1_name,
                   u2.username as player2_name,
                   w.username as winner_name
            FROM battles b
            LEFT JOIN users u1 ON b.player1_id = u1.id
            LEFT JOIN users u2 ON b.player2_id = u2.id  
            LEFT JOIN users w ON b.winner_id = w.id
            WHERE b.player1_id = ? OR b.player2_id = ?
            ORDER BY b.created_at DESC LIMIT 20`, [userId, userId], (err, battles) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const history = battles.map(battle => ({
            id: battle.id,
            opponent: battle.player1_id === userId ? battle.player2_name : battle.player1_name,
            result: battle.winner_id === userId ? 'win' : (battle.winner_id ? 'loss' : 'ongoing'),
            problemId: battle.problem_id,
            date: battle.created_at
        }));

        res.json(history);
    });
});

module.exports = router;