const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const userRoutes = require('./routes/user');
const leaderboardRoutes = require('./routes/leaderboard');
const lessonRoutes = require('./routes/lessons');
const battleRoutes = require('./routes/battles');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Routes
app.use('/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/practice', problemRoutes); // Alias for practice mode
app.use('/api/user', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/battles', battleRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'CODECADE Backend Running' });
});

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/index.html'));
});

// Serve specific pages
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/dashboard.html'));
});

app.get('/practice-new.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/practice-new.html'));
});

app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/profile.html'));
});

app.get('/leaderboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/leaderboard.html'));
});

app.get('/learn.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/learn.html'));
});

app.get('/problem.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/problem.html'));
});

app.get('/battle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/battle.html'));
});

app.get('/pages/:page', (req, res) => {
    res.sendFile(path.join(__dirname, `../../frontend/pages/${req.params.page}`));
});

// Catch-all for frontend routing
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../../frontend/pages/index.html'));
});

// Initialize database and start server
async function startServer() {
    try {
        await initDatabase();
        console.log('✅ Database initialized');
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log('📝 Test credentials: test@example.com / password123');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();