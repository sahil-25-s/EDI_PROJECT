const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Sample lessons data
const lessons = {
    'arrays-basics': {
        id: 'arrays-basics',
        title: 'Arrays Fundamentals',
        category: 'Arrays',
        difficulty: 'Beginner',
        content: 'Learn the basics of arrays, indexing, and common operations.',
        xpReward: 25
    },
    'linked-lists': {
        id: 'linked-lists',
        title: 'Linked Lists',
        category: 'Data Structures',
        difficulty: 'Beginner',
        content: 'Understanding linked lists, nodes, and basic operations.',
        xpReward: 30
    },
    'stacks-queues': {
        id: 'stacks-queues',
        title: 'Stacks and Queues',
        category: 'Data Structures',
        difficulty: 'Intermediate',
        content: 'Learn about LIFO and FIFO data structures.',
        xpReward: 35
    },
    'binary-search': {
        id: 'binary-search',
        title: 'Binary Search',
        category: 'Algorithms',
        difficulty: 'Intermediate',
        content: 'Master the binary search algorithm and its applications.',
        xpReward: 40
    },
    'sorting-algorithms': {
        id: 'sorting-algorithms',
        title: 'Sorting Algorithms',
        category: 'Algorithms',
        difficulty: 'Intermediate',
        content: 'Compare different sorting algorithms and their complexities.',
        xpReward: 45
    }
};

// Get all lessons
router.get('/', (req, res) => {
    const lessonList = Object.values(lessons).map(l => ({
        id: l.id,
        title: l.title,
        category: l.category,
        difficulty: l.difficulty
    }));
    res.json(lessonList);
});

// Get specific lesson
router.get('/:id', (req, res) => {
    const lesson = lessons[req.params.id];
    if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
});

// Complete lesson
router.post('/:id/complete', authenticateToken, (req, res) => {
    const lessonId = req.params.id;
    const userId = req.user.userId;
    
    const lesson = lessons[lessonId];
    if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
    }

    // Check if already completed
    db.get('SELECT id FROM completed_lessons WHERE user_id = ? AND lesson_id = ?', 
        [userId, lessonId], (err, existing) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (existing) {
                return res.json({
                    success: false,
                    message: 'Lesson already completed!'
                });
            }

            // Mark as completed
            db.run(`INSERT INTO completed_lessons (user_id, lesson_id) VALUES (?, ?)`,
                [userId, lessonId], function(err) {
                    if (err) {
                        console.error('Error saving lesson completion:', err);
                        return res.status(500).json({ error: 'Failed to save completion' });
                    }

                    // Update user XP
                    const xpGained = lesson.xpReward;
                    db.get('SELECT xp, level FROM users WHERE id = ?', [userId], (err, user) => {
                        if (err) {
                            console.error('Error getting user:', err);
                            return;
                        }

                        const newXP = user.xp + xpGained;
                        const newLevel = Math.floor(newXP / 100) + 1;
                        
                        db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', 
                            [newXP, newLevel, userId], (err) => {
                                if (err) {
                                    console.error('Error updating user XP:', err);
                                }
                            });
                    });

                    res.json({
                        success: true,
                        message: 'Lesson completed! +' + xpGained + ' XP',
                        xpGained
                    });
                });
        });
});

module.exports = router;