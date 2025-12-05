const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Sample problems data
const problems = {
    'two-sum': {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        examples: [
            {
                input: 'nums = [2,7,11,15], target = 9',
                output: '[0,1]',
                explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
            }
        ],
        constraints: [
            '2 <= nums.length <= 10^4',
            '-10^9 <= nums[i] <= 10^9',
            '-10^9 <= target <= 10^9'
        ],
        xpReward: 50
    },
    'reverse-string': {
        id: 'reverse-string',
        title: 'Reverse String',
        difficulty: 'Easy',
        description: 'Write a function that reverses a string. The input string is given as an array of characters s.',
        examples: [
            {
                input: 's = ["h","e","l","l","o"]',
                output: '["o","l","l","e","h"]'
            }
        ],
        constraints: [
            '1 <= s.length <= 10^5',
            's[i] is a printable ascii character.'
        ],
        xpReward: 40
    },
    'palindrome-number': {
        id: 'palindrome-number',
        title: 'Palindrome Number',
        difficulty: 'Easy',
        description: 'Given an integer x, return true if x is palindrome integer.',
        examples: [
            {
                input: 'x = 121',
                output: 'true',
                explanation: '121 reads as 121 from left to right and from right to left.'
            }
        ],
        constraints: ['-2^31 <= x <= 2^31 - 1'],
        xpReward: 45
    },
    'valid-parentheses': {
        id: 'valid-parentheses',
        title: 'Valid Parentheses',
        difficulty: 'Easy',
        description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
        examples: [
            {
                input: 's = "()"',
                output: 'true'
            }
        ],
        constraints: ['1 <= s.length <= 10^4'],
        xpReward: 60
    },
    'merge-sorted-arrays': {
        id: 'merge-sorted-arrays',
        title: 'Merge Two Sorted Lists',
        difficulty: 'Easy',
        description: 'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a sorted list.',
        examples: [
            {
                input: 'list1 = [1,2,4], list2 = [1,3,4]',
                output: '[1,1,2,3,4,4]'
            }
        ],
        constraints: ['The number of nodes in both lists is in the range [0, 50].'],
        xpReward: 70
    }
};

// Get all problems
router.get('/', (req, res) => {
    const problemList = Object.values(problems).map(p => ({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty
    }));
    res.json(problemList);
});

// Get specific problem
router.get('/:id', (req, res) => {
    const problem = problems[req.params.id];
    if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
    }
    res.json(problem);
});

// Submit solution
router.post('/:id/submit', authenticateToken, (req, res) => {
    const { solution, language } = req.body;
    const problemId = req.params.id;
    const userId = req.user.userId;
    
    if (!solution || !language) {
        return res.status(400).json({ error: 'Solution and language are required' });
    }

    const problem = problems[problemId];
    if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
    }

    // Check if already solved
    db.get('SELECT id FROM solved_problems WHERE user_id = ? AND problem_id = ?', 
        [userId, problemId], (err, existingSolution) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (existingSolution) {
                return res.json({
                    success: false,
                    message: 'Problem already solved!',
                    testsPassed: 0
                });
            }

            // Simple validation - check solution length and basic keywords
            const isCorrect = solution.length > 20 && 
                             (solution.includes('return') || solution.includes('print'));
            
            if (isCorrect) {
                // Save solution
                db.run(`INSERT INTO solved_problems (user_id, problem_id, solution, language) VALUES (?, ?, ?, ?)`,
                    [userId, problemId, solution, language], function(err) {
                        if (err) {
                            console.error('Error saving solution:', err);
                            return res.status(500).json({ error: 'Failed to save solution' });
                        }

                        // Update user XP and level
                        const xpGained = problem.xpReward;
                        db.get('SELECT xp, level FROM users WHERE id = ?', [userId], (err, user) => {
                            if (err) {
                                console.error('Error getting user:', err);
                                return;
                            }

                            const newXP = user.xp + xpGained;
                            const newLevel = Math.floor(newXP / 100) + 1; // Level up every 100 XP
                            
                            db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', 
                                [newXP, newLevel, userId], (err) => {
                                    if (err) {
                                        console.error('Error updating user XP:', err);
                                    }
                                });
                        });

                        res.json({
                            success: true,
                            message: 'Solution accepted! +' + xpGained + ' XP',
                            testsPassed: 100,
                            xpGained
                        });
                    });
            } else {
                res.json({
                    success: false,
                    message: 'Solution incorrect. Try again.',
                    testsPassed: 0
                });
            }
        });
});

module.exports = router;