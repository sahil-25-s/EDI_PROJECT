const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 0,
                college TEXT DEFAULT '',
                battle_rating INTEGER DEFAULT 1200,
                battle_wins INTEGER DEFAULT 0,
                battle_losses INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Solved problems table
            db.run(`CREATE TABLE IF NOT EXISTS solved_problems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                problem_id TEXT,
                solution TEXT,
                language TEXT,
                solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Completed lessons table
            db.run(`CREATE TABLE IF NOT EXISTS completed_lessons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                lesson_id TEXT,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Battles table
            db.run(`CREATE TABLE IF NOT EXISTS battles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1_id INTEGER,
                player2_id INTEGER,
                problem_id TEXT,
                winner_id INTEGER,
                status TEXT DEFAULT 'waiting',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player1_id) REFERENCES users (id),
                FOREIGN KEY (player2_id) REFERENCES users (id),
                FOREIGN KEY (winner_id) REFERENCES users (id)
            )`);

            // Create test user
            const testEmail = 'test@example.com';
            db.get('SELECT id FROM users WHERE email = ?', [testEmail], async (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }
                
                if (!row) {
                    try {
                        const passwordHash = await bcrypt.hash('password123', 10);
                        db.run(`INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
                            ['TestPlayer', testEmail, passwordHash], (err) => {
                                if (err) {
                                    console.error('Error creating test user:', err);
                                    reject(err);
                                } else {
                                    console.log('✅ Test user created: test@example.com / password123');
                                    resolve();
                                }
                            });
                    } catch (error) {
                        console.error('Error hashing password:', error);
                        reject(error);
                    }
                } else {
                    console.log('ℹ️  Test user already exists');
                    resolve();
                }
            });
        });
    });
}

module.exports = { db, initDatabase };