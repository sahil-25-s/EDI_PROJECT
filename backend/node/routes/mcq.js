const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get random MCQ questions
router.get('/random', authenticateToken, (req, res) => {
    const count = parseInt(req.query.count) || 5;
    
    db.all('SELECT * FROM mcq_questions ORDER BY RANDOM() LIMIT ?', [count], (err, questions) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!questions || questions.length === 0) {
            // Return default questions if none in database
            return res.json([
                {
                    id: 1,
                    question: "What is the time complexity of binary search?",
                    options: JSON.stringify(["O(n)", "O(log n)", "O(n²)", "O(1)"]),
                    correct_answer: 1,
                    difficulty: "easy"
                },
                {
                    id: 2,
                    question: "Which data structure uses LIFO principle?",
                    options: JSON.stringify(["Queue", "Stack", "Array", "Linked List"]),
                    correct_answer: 1,
                    difficulty: "easy"
                },
                {
                    id: 3,
                    question: "What is the worst-case time complexity of quicksort?",
                    options: JSON.stringify(["O(n log n)", "O(n²)", "O(n)", "O(log n)"]),
                    correct_answer: 1,
                    difficulty: "medium"
                },
                {
                    id: 4,
                    question: "In a binary tree, what is the maximum number of nodes at level 3?",
                    options: JSON.stringify(["4", "6", "8", "16"]),
                    correct_answer: 2,
                    difficulty: "medium"
                },
                {
                    id: 5,
                    question: "Which algorithm finds shortest path in weighted graph?",
                    options: JSON.stringify(["BFS", "DFS", "Dijkstra's", "Binary Search"]),
                    correct_answer: 2,
                    difficulty: "hard"
                }
            ]);
        }
        
        res.json(questions);
    });
});

module.exports = router;
