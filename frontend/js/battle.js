const API_BASE = window.location.origin.includes('8080') ? 'http://localhost:8080' : 'http://localhost:3000';
const AUTH_TOKEN = localStorage.getItem('token');
let socket;
let battleState = {
    battleId: null,
    currentQuestion: 0,
    questions: [],
    answers: [],
    score: 0,
    opponentScore: 0,
    timeRemaining: 30,
    timerInterval: null,
    startTime: Date.now(),
    player1: {},
    player2: {}
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!AUTH_TOKEN) {
        window.location.href = 'index.html';
        return;
    }
    initSocket();
    loadUserStats();
    loadOnlinePlayers();
    setupEventListeners();
});

// Socket.IO Connection
function initSocket() {
    socket = io(API_BASE, { auth: { token: AUTH_TOKEN } });
    
    socket.on('connect', () => {
        console.log('Connected to battle server');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        socket.emit('join_lobby', { token: AUTH_TOKEN, user });
    });

    socket.on('players_update', (players) => {
        updatePlayersList(players);
    });

    socket.on('match_found', (data) => {
        startBattle(data);
    });

    socket.on('opponent_answered', (data) => {
        battleState.opponentScore = data.score;
        updateScores();
    });

    socket.on('battle_ended', (results) => {
        showResults(results);
    });

    socket.on('opponent_disconnected', () => {
        alert('Opponent disconnected. You win by default!');
        location.reload();
    });
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('findMatchBtn').addEventListener('click', findMatch);
    document.getElementById('submitAnswerBtn').addEventListener('click', submitAnswer);
    document.getElementById('finishBattleBtn').addEventListener('click', finishBattle);
}

// Load User Stats
async function loadUserStats() {
    try {
        const response = await fetch(`${API_BASE}/api/battles/stats`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        const stats = await response.json();
        
        document.getElementById('userWins').textContent = stats.wins || 0;
        document.getElementById('userLosses').textContent = stats.losses || 0;
        document.getElementById('userRating').textContent = stats.rating || 1200;
        const winRate = stats.wins + stats.losses > 0 ? 
            Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0;
        document.getElementById('winRate').textContent = winRate + '%';
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load Online Players
async function loadOnlinePlayers() {
    try {
        const response = await fetch(`${API_BASE}/api/battles/online`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        const players = await response.json();
        updatePlayersList(players);
    } catch (error) {
        console.error('Failed to load players:', error);
    }
}

// Update Players List
function updatePlayersList(players) {
    const container = document.getElementById('playersList');
    document.getElementById('onlineCount').textContent = players.length;
    
    if (players.length === 0) {
        container.innerHTML = '<p class="text-glow-purple text-center">No players online</p>';
        return;
    }
    
    container.innerHTML = players.map(player => `
        <div class="flex items-center justify-between p-3 bg-gray-800 rounded border border-purple-500">
            <div class="flex items-center gap-3">
                <div class="online-dot"></div>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}" 
                     class="w-12 h-12 rounded-full border-2 border-purple-500">
                <div>
                    <div class="text-glow-magenta">${player.username}</div>
                    <div class="text-sm text-glow-purple">Level ${player.level} • Rating: ${player.rating || 1200}</div>
                </div>
            </div>
            <button onclick="challengePlayer('${player.id}')" class="retro-btn retro-btn-pink text-sm">
                CHALLENGE
            </button>
        </div>
    `).join('');
}

// Challenge Player
function challengePlayer(playerId) {
    socket.emit('challenge_player', { playerId });
    alert('Challenge sent! Waiting for response...');
}

// Find Match
async function findMatch() {
    const skillLevel = document.getElementById('skillLevel').value;
    const topic = document.getElementById('topicSelect').value;
    
    document.getElementById('findMatchBtn').disabled = true;
    document.getElementById('matchmakingStatus').classList.remove('hidden');
    
    try {
        socket.emit('find_match', { skillLevel, topic });
    } catch (error) {
        console.error('Matchmaking failed:', error);
        document.getElementById('findMatchBtn').disabled = false;
        document.getElementById('matchmakingStatus').classList.add('hidden');
    }
}

// Start Battle
async function startBattle(data) {
    battleState.battleId = data.battleId;
    battleState.player1 = data.player1;
    battleState.player2 = data.player2;
    
    // Load questions
    try {
        const response = await fetch(`${API_BASE}/api/battles/${data.battleId}/questions`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        battleState.questions = await response.json();
    } catch (error) {
        battleState.questions = generateMockQuestions();
    }
    
    // Switch to battle screen
    document.getElementById('lobbyScreen').classList.add('hidden');
    document.getElementById('battleScreen').classList.remove('hidden');
    
    // Update player info
    document.getElementById('player1Name').textContent = battleState.player1.username;
    document.getElementById('player1Level').textContent = battleState.player1.level;
    document.getElementById('player2Name').textContent = battleState.player2.username;
    document.getElementById('player2Level').textContent = battleState.player2.level;
    
    // Load first question
    loadQuestion(0);
    startTimer();
}

// Generate Mock Questions
function generateMockQuestions() {
    return [
        {
            id: 1,
            title: "Two Sum",
            description: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
            options: ["Use nested loops", "Use hash map", "Sort and two pointers", "Binary search"],
            correctAnswer: 1
        },
        {
            id: 2,
            title: "Valid Parentheses",
            description: "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
            options: ["Use stack", "Use queue", "Use recursion", "Use counter"],
            correctAnswer: 0
        },
        {
            id: 3,
            title: "Binary Search",
            description: "What is the time complexity of binary search?",
            options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
            correctAnswer: 1
        },
        {
            id: 4,
            title: "Linked List Cycle",
            description: "How to detect a cycle in a linked list?",
            options: ["Use hash set", "Floyd's cycle detection", "Both A and B", "Not possible"],
            correctAnswer: 2
        },
        {
            id: 5,
            title: "Maximum Subarray",
            description: "Which algorithm solves maximum subarray problem efficiently?",
            options: ["Brute force", "Kadane's algorithm", "Divide and conquer", "Dynamic programming"],
            correctAnswer: 1
        }
    ];
}

// Load Question
function loadQuestion(index) {
    if (index >= battleState.questions.length) {
        finishBattle();
        return;
    }
    
    const question = battleState.questions[index];
    battleState.currentQuestion = index;
    
    document.getElementById('questionTitle').textContent = question.title;
    document.getElementById('questionDescription').textContent = question.description;
    document.getElementById('currentQuestion').textContent = index + 1;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = question.options.map((option, i) => `
        <div class="option-btn" data-index="${i}">
            ${String.fromCharCode(65 + i)}. ${option}
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => selectOption(btn));
    });
    
    // Update progress
    const progress = ((index + 1) / battleState.questions.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    
    // Reset timer
    battleState.timeRemaining = 30;
    document.getElementById('submitAnswerBtn').disabled = true;
}

// Select Option
function selectOption(btn) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('submitAnswerBtn').disabled = false;
}

// Start Timer
function startTimer() {
    battleState.timerInterval = setInterval(() => {
        battleState.timeRemaining--;
        document.getElementById('timer').textContent = battleState.timeRemaining;
        
        if (battleState.timeRemaining <= 0) {
            submitAnswer(true); // Auto-submit on timeout
        }
    }, 1000);
}

// Submit Answer
async function submitAnswer(timeout = false) {
    clearInterval(battleState.timerInterval);
    
    const selectedBtn = document.querySelector('.option-btn.selected');
    const selectedIndex = selectedBtn ? parseInt(selectedBtn.dataset.index) : -1;
    const question = battleState.questions[battleState.currentQuestion];
    const isCorrect = selectedIndex === question.correctAnswer;
    
    // Calculate score (correct answer + time bonus)
    if (isCorrect) {
        const timeBonus = Math.max(0, battleState.timeRemaining * 2);
        battleState.score += 100 + timeBonus;
    }
    
    // Show feedback
    if (selectedBtn) {
        selectedBtn.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    document.querySelectorAll('.option-btn')[question.correctAnswer].classList.add('correct');
    
    // Save answer
    battleState.answers.push({
        questionId: question.id,
        answer: selectedIndex,
        correct: isCorrect,
        timeSpent: 30 - battleState.timeRemaining
    });
    
    // Notify opponent
    socket.emit('answer_submitted', {
        battleId: battleState.battleId,
        score: battleState.score
    });
    
    // Update UI
    updateScores();
    
    // Next question after delay
    setTimeout(() => {
        loadQuestion(battleState.currentQuestion + 1);
        startTimer();
    }, 2000);
}

// Update Scores
function updateScores() {
    document.getElementById('player1Score').textContent = battleState.score;
    document.getElementById('player2Score').textContent = battleState.opponentScore;
}

// Finish Battle
async function finishBattle() {
    clearInterval(battleState.timerInterval);
    
    const totalTime = Math.floor((Date.now() - battleState.startTime) / 1000);
    
    try {
        const response = await fetch(`${API_BASE}/api/battles/${battleState.battleId}/finish`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                score: battleState.score,
                answers: battleState.answers,
                timeSpent: totalTime
            })
        });
        
        const results = await response.json();
        showResults(results);
    } catch (error) {
        // Mock results
        showResults({
            winner: battleState.score > battleState.opponentScore ? battleState.player1 : battleState.player2,
            player1: { ...battleState.player1, score: battleState.score, time: totalTime },
            player2: { ...battleState.player2, score: battleState.opponentScore, time: totalTime + 10 },
            performance: {
                accuracy: Math.round((battleState.answers.filter(a => a.correct).length / battleState.answers.length) * 100),
                avgTime: Math.round(totalTime / battleState.answers.length),
                correctAnswers: battleState.answers.filter(a => a.correct).length,
                totalQuestions: battleState.answers.length
            }
        });
    }
}

// Show Results
function showResults(results) {
    document.getElementById('battleScreen').classList.add('hidden');
    document.getElementById('resultsModal').classList.remove('hidden');
    
    const isWinner = results.winner.id === battleState.player1.id;
    document.getElementById('resultTitle').textContent = isWinner ? '🎉 VICTORY! 🎉' : '💔 DEFEAT 💔';
    
    // Player 1
    document.getElementById('resultPlayer1Avatar').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${results.player1.username}`;
    document.getElementById('resultPlayer1Name').textContent = results.player1.username;
    document.getElementById('resultPlayer1Score').textContent = results.player1.score + ' pts';
    document.getElementById('resultPlayer1Time').textContent = results.player1.time + 's';
    
    // Player 2
    document.getElementById('resultPlayer2Avatar').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${results.player2.username}`;
    document.getElementById('resultPlayer2Name').textContent = results.player2.username;
    document.getElementById('resultPlayer2Score').textContent = results.player2.score + ' pts';
    document.getElementById('resultPlayer2Time').textContent = results.player2.time + 's';
    
    // Performance
    document.getElementById('performanceDetails').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div><span class="text-glow-purple">Accuracy:</span> <span class="text-glow-pink">${results.performance.accuracy}%</span></div>
            <div><span class="text-glow-purple">Avg Time:</span> <span class="text-glow-pink">${results.performance.avgTime}s</span></div>
            <div><span class="text-glow-purple">Correct:</span> <span class="text-glow-pink">${results.performance.correctAnswers}/${results.performance.totalQuestions}</span></div>
            <div><span class="text-glow-purple">Rating Change:</span> <span class="text-glow-pink">${isWinner ? '+25' : '-15'}</span></div>
        </div>
    `;
}
