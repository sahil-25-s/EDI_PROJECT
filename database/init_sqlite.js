// SQLite Database Initialization Script for CODECADE
// Run with: node init_sqlite.js

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/node/database.sqlite');
const db = new sqlite3.Database(dbPath);

async function initDatabase() {
  console.log('✅ Connected to SQLite database');
  
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // Create users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        college TEXT DEFAULT '',
        battle_rating INTEGER DEFAULT 1200,
        battle_wins INTEGER DEFAULT 0,
        battle_losses INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Create other tables
      db.run(`CREATE TABLE IF NOT EXISTS problems (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        input_format TEXT,
        output_format TEXT,
        example TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      db.run(`CREATE TABLE IF NOT EXISTS solved_problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        problem_id TEXT,
        solution TEXT,
        language TEXT,
        solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (problem_id) REFERENCES problems (id)
      )`);
      
      db.run(`CREATE TABLE IF NOT EXISTS completed_lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        lesson_id TEXT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);
      
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
      
      console.log('✅ Created database tables');
      
      // Create test user
      db.get('SELECT id FROM users WHERE email = ?', ['test@example.com'], async (err, row) => {
        if (!row) {
          const passwordHash = await bcrypt.hash('password123', 10);
          db.run(`INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
            ['TestPlayer', 'test@example.com', passwordHash, 'user'], (err) => {
              if (err) {
                console.error('Error creating test user:', err);
              } else {
                console.log('✅ Created test user: test@example.com / password123');
              }
            });
        } else {
          console.log('ℹ️  Test user already exists');
        }
      });
      
      // Create admin user
      db.get('SELECT id FROM users WHERE email = ?', ['admin@codecade.com'], async (err, row) => {
        if (!row) {
          const adminPasswordHash = await bcrypt.hash('admin123', 10);
          db.run(`INSERT INTO users (username, email, password_hash, role, college) VALUES (?, ?, ?, ?, ?)`,
            ['Admin', 'admin@codecade.com', adminPasswordHash, 'admin', 'CODECADE'], (err) => {
              if (err) {
                console.error('Error creating admin user:', err);
              } else {
                console.log('✅ Created admin user: admin@codecade.com / admin123');
              }
            });
        } else {
          console.log('ℹ️  Admin user already exists');
        }
        
        console.log('\n🎉 SQLite database initialization complete!');
        db.close();
        resolve();
      });
    });
  });
}

initDatabase().catch(console.error);