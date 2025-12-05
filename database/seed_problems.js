const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../backend/python/.env' });

const problems = [
    {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9' }
        ],
        constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Only one valid answer exists'],
        tags: ['Array', 'Hash Table'],
        avgTime: 15,
        successRate: 85
    },
    {
        id: 'valid-parentheses',
        title: 'Valid Parentheses',
        difficulty: 'Easy',
        description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
        examples: [
            { input: 's = "()"', output: 'true' },
            { input: 's = "()[]{}"', output: 'true' },
            { input: 's = "(]"', output: 'false' }
        ],
        constraints: ['1 <= s.length <= 10^4'],
        tags: ['Stack', 'String'],
        avgTime: 10,
        successRate: 78
    },
    {
        id: 'reverse-linked-list',
        title: 'Reverse Linked List',
        difficulty: 'Easy',
        description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
        examples: [
            { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' }
        ],
        constraints: ['The number of nodes in the list is the range [0, 5000]'],
        tags: ['Linked List', 'Recursion'],
        avgTime: 8,
        successRate: 72
    },
    {
        id: 'binary-search',
        title: 'Binary Search',
        difficulty: 'Easy',
        description: 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums.',
        examples: [
            { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' }
        ],
        constraints: ['1 <= nums.length <= 10^4', 'All integers in nums are unique'],
        tags: ['Array', 'Binary Search'],
        avgTime: 10,
        successRate: 80
    },
    {
        id: 'climbing-stairs',
        title: 'Climbing Stairs',
        difficulty: 'Easy',
        description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
        examples: [
            { input: 'n = 2', output: '2', explanation: '1. 1 step + 1 step\n2. 2 steps' },
            { input: 'n = 3', output: '3' }
        ],
        constraints: ['1 <= n <= 45'],
        tags: ['Dynamic Programming'],
        avgTime: 15,
        successRate: 75
    },
    {
        id: 'maximum-subarray',
        title: 'Maximum Subarray',
        difficulty: 'Medium',
        description: 'Given an integer array nums, find the contiguous subarray which has the largest sum and return its sum.',
        examples: [
            { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: '[4,-1,2,1] has the largest sum = 6' }
        ],
        constraints: ['1 <= nums.length <= 10^5'],
        tags: ['Array', 'Dynamic Programming'],
        avgTime: 20,
        successRate: 65
    },
    {
        id: 'longest-substring-without-repeating',
        title: 'Longest Substring Without Repeating Characters',
        difficulty: 'Medium',
        description: 'Given a string s, find the length of the longest substring without repeating characters.',
        examples: [
            { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3' }
        ],
        constraints: ['0 <= s.length <= 5 * 10^4'],
        tags: ['String', 'Sliding Window', 'Hash Table'],
        avgTime: 25,
        successRate: 58
    },
    {
        id: 'three-sum',
        title: '3Sum',
        difficulty: 'Medium',
        description: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
        examples: [
            { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' }
        ],
        constraints: ['3 <= nums.length <= 3000'],
        tags: ['Array', 'Two Pointers', 'Sorting'],
        avgTime: 30,
        successRate: 52
    },
    {
        id: 'container-with-most-water',
        title: 'Container With Most Water',
        difficulty: 'Medium',
        description: 'You are given an integer array height of length n. Find two lines that together with the x-axis form a container, such that the container contains the most water.',
        examples: [
            { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49' }
        ],
        constraints: ['n == height.length', '2 <= n <= 10^5'],
        tags: ['Array', 'Two Pointers', 'Greedy'],
        avgTime: 20,
        successRate: 60
    },
    {
        id: 'trapping-rain-water',
        title: 'Trapping Rain Water',
        difficulty: 'Hard',
        description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
        examples: [
            { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6' }
        ],
        constraints: ['n == height.length', '1 <= n <= 2 * 10^4'],
        tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
        avgTime: 40,
        successRate: 45
    },
    {
        id: 'median-of-two-sorted-arrays',
        title: 'Median of Two Sorted Arrays',
        difficulty: 'Hard',
        description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
        examples: [
            { input: 'nums1 = [1,3], nums2 = [2]', output: '2.00000' }
        ],
        constraints: ['nums1.length == m', 'nums2.length == n', '0 <= m <= 1000'],
        tags: ['Array', 'Binary Search', 'Divide and Conquer'],
        avgTime: 50,
        successRate: 35
    },
    {
        id: 'n-queens',
        title: 'N-Queens',
        difficulty: 'Hard',
        description: 'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.',
        examples: [
            { input: 'n = 4', output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]' }
        ],
        constraints: ['1 <= n <= 9'],
        tags: ['Array', 'Backtracking'],
        avgTime: 45,
        successRate: 40
    }
];

async function seedProblems() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('codecade');
        const collection = db.collection('problems');
        
        await collection.deleteMany({});
        console.log('Cleared existing problems');
        
        await collection.insertMany(problems);
        console.log(`✅ Inserted ${problems.length} problems`);
        
    } catch (error) {
        console.error('Error seeding problems:', error);
    } finally {
        await client.close();
    }
}

seedProblems();
