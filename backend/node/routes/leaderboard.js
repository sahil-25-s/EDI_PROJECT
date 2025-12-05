const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Get leaderboard
router.get('/', (req, res) => {
    db.all(`SELECT username, level, xp, battle_rating, battle_wins, battle_losses 
            FROM users 
            ORDER BY level DESC, xp DESC 
            LIMIT 50`, (err, users) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            username: user.username,
            level: user.level,
            xp: user.xp,
            battleRating: user.battle_rating,
            battleWins: user.battle_wins,
            battleLosses: user.battle_losses
        }));

        res.json(leaderboard);
    });
});

module.exports = router;