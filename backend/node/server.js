const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const userRoutes = require('./routes/user');
const leaderboardRoutes = require('./routes/leaderboard');
const lessonRoutes = require('./routes/lessons');
const battleRoutes = require('./routes/battles');
const adminRoutes = require('./routes/admin');
const mcqRoutes = require('./routes/mcq');
const executeRoutes = require('./routes/execute');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

// Battle matchmaking queue
const battleQueue = [];
const activePlayers = new Map();

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
app.use('/api/admin', adminRoutes);
app.use('/api/mcq', mcqRoutes);
app.use('/api/execute', executeRoutes);

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

app.get('/test.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/test.html'));
});

app.get('/battle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/battle.html'));
});

app.get('/home.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/home.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/about.html'));
});

app.get('/roadmap.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/roadmap.html'));
});

app.get('/help.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/help.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/admin.html'));
});

app.get('/pages/:page', (req, res) => {
    res.sendFile(path.join(__dirname, `../../frontend/pages/${req.params.page}`));
});

// Socket.IO for real-time battles
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join_lobby', (data) => {
        const user = data.user;
        activePlayers.set(socket.id, { ...user, socketId: socket.id });
        io.emit('players_update', Array.from(activePlayers.values()));
    });
    
    socket.on('find_match', (data) => {
        const player = activePlayers.get(socket.id);
        if (!player) return;
        
        // Check if someone is waiting
        const waitingPlayer = battleQueue.find(p => p.socketId !== socket.id);
        
        if (waitingPlayer) {
            // Match found
            battleQueue.splice(battleQueue.indexOf(waitingPlayer), 1);
            const battleId = `battle_${Date.now()}`;
            
            socket.emit('match_found', {
                battleId,
                player1: player,
                player2: waitingPlayer
            });
            
            io.to(waitingPlayer.socketId).emit('match_found', {
                battleId,
                player1: waitingPlayer,
                player2: player
            });
        } else {
            // Add to queue
            battleQueue.push(player);
        }
    });
    
    socket.on('answer_submitted', (data) => {
        socket.broadcast.emit('opponent_answered', data);
    });
    
    socket.on('disconnect', () => {
        const player = activePlayers.get(socket.id);
        if (player) {
            const queueIndex = battleQueue.findIndex(p => p.socketId === socket.id);
            if (queueIndex !== -1) battleQueue.splice(queueIndex, 1);
            activePlayers.delete(socket.id);
            io.emit('players_update', Array.from(activePlayers.values()));
        }
    });
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
        
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log('⚔️  Battle system ready with Socket.IO');
            console.log('📝 Test credentials: test@example.com / password123');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();