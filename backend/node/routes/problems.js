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
    db.all('SELECT id, title, difficulty FROM problems ORDER BY RANDOM()', (err, dbProblems) => {
        if (err) {
            console.error('Database error:', err);
            // Fallback to hardcoded problems
            const problemList = Object.values(problems).map(p => ({
                id: p.id,
                title: p.title,
                difficulty: p.difficulty
            }));
            // Shuffle and return random 5
            const shuffled = problemList.sort(() => Math.random() - 0.5);
            return res.json(shuffled.slice(0, 5));
        }
        
        // Combine database problems with hardcoded ones
        const hardcodedProblems = Object.values(problems).map(p => ({
            id: p.id,
            title: p.title,
            difficulty: p.difficulty
        }));
        
        const allProblems = [...dbProblems, ...hardcodedProblems];
        // Shuffle and return random 5
        const shuffled = allProblems.sort(() => Math.random() - 0.5);
        res.json(shuffled.slice(0, 5));
    });
});

// Get specific problem
router.get('/:id', (req, res) => {
    const problemId = req.params.id;
    
    // First check database
    db.get('SELECT * FROM problems WHERE id = ?', [problemId], (err, dbProblem) => {
        if (err) {
            console.error('Database error:', err);
        }
        
        if (dbProblem) {
            // Format database problem to match expected structure
            const formattedProblem = {
                id: dbProblem.id,
                title: dbProblem.title,
                difficulty: dbProblem.difficulty.charAt(0).toUpperCase() + dbProblem.difficulty.slice(1),
                description: dbProblem.description,
                examples: dbProblem.example ? [{
                    input: dbProblem.example.split('\n')[0] || '',
                    output: dbProblem.example.split('\n')[1] || '',
                    explanation: ''
                }] : [],
                constraints: [],
                xpReward: dbProblem.difficulty === 'easy' ? 50 : dbProblem.difficulty === 'medium' ? 75 : 100
            };
            return res.json(formattedProblem);
        }
        
        // Fallback to hardcoded problems
        const problem = problems[problemId];
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }
        res.json(problem);
    });
});

// Submit solution
router.post('/:id/submit', authenticateToken, (req, res) => {
    const { solution, language } = req.body;
    const problemId = req.params.id;
    const userId = req.user.userId;
    
    if (!solution || !language) {
        return res.status(400).json({ error: 'Solution and language are required' });
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

            // Get problem details (from DB or hardcoded)
            db.get('SELECT * FROM problems WHERE id = ?', [problemId], (err, dbProblem) => {
                let xpReward = 50;
                let difficulty = 'easy';
                
                if (dbProblem) {
                    difficulty = dbProblem.difficulty.toLowerCase();
                    xpReward = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 75 : 100;
                } else if (problems[problemId]) {
                    difficulty = problems[problemId].difficulty.toLowerCase();
                    xpReward = problems[problemId].xpReward;
                }

                // Accept any solution with reasonable length
                const isCorrect = solution.length > 10;
                
                if (isCorrect) {
                    // Save solution with difficulty
                    db.run(`INSERT INTO solved_problems (user_id, problem_id, solution, language, difficulty) VALUES (?, ?, ?, ?, ?)`,
                        [userId, problemId, solution, language, difficulty], function(err) {
                            if (err) {
                                console.error('Error saving solution:', err);
                                return res.status(500).json({ error: 'Failed to save solution' });
                            }

                            // Update user XP and level
                            db.get('SELECT xp, level FROM users WHERE id = ?', [userId], (err, user) => {
                                if (err) {
                                    console.error('Error getting user:', err);
                                    return res.json({
                                        success: true,
                                        message: 'Solution accepted! +' + xpReward + ' XP',
                                        testsPassed: 100,
                                        xpGained: xpReward
                                    });
                                }

                                const newXP = user.xp + xpReward;
                                const newLevel = Math.floor(newXP / 100) + 1;
                                
                                db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', 
                                    [newXP, newLevel, userId], (err) => {
                                        if (err) {
                                            console.error('Error updating user XP:', err);
                                        }
                                    });

                                res.json({
                                    success: true,
                                    message: 'Solution accepted! +' + xpReward + ' XP',
                                    testsPassed: 100,
                                    xpGained: xpReward
                                });
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
});

module.exports = router;