// CODECADE Frontend API Integration
// Automatically detect API URL for local or production
const API_URL = window.location.origin || 'http://localhost:3000';

// Auth Functions
async function signup(username, email, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return { success: true, data };
  }
  return { success: false, error: data.error };
}

async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return { success: true, data };
  }
  return { success: false, error: data.error };
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

// Auth Check
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// Get Auth Headers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// User Functions
async function getUserStats() {
  const response = await fetch(`${API_URL}/user/stats`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

async function getUserProgress() {
  const response = await fetch(`${API_URL}/user/progress`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

// Problem Functions
async function solveProblem(problemId, attempts = 1, timeTaken = 0, xpReward = 10) {
  const response = await fetch(`${API_URL}/problems/solve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ problemId, attempts, timeTaken, xpReward })
  });
  return await response.json();
}

async function getSolvedProblems() {
  const response = await fetch(`${API_URL}/problems/solved`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

// Lesson Functions
async function completeLesson(lessonId, xpReward = 5) {
  const response = await fetch(`${API_URL}/lessons/complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ lessonId, xpReward })
  });
  return await response.json();
}

async function getCompletedLessons() {
  const response = await fetch(`${API_URL}/lessons/completed`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

// Battle Functions
async function saveBattleResult(opponentId, result, xpReward = 20) {
  const response = await fetch(`${API_URL}/battle/result`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ opponentId, result, xpReward })
  });
  return await response.json();
}

async function getBattleHistory() {
  const response = await fetch(`${API_URL}/battle/history`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}
