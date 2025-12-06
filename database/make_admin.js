// Script to make a user admin
// Usage: node make_admin.js <email>

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../backend/node/database.sqlite');
const db = new sqlite3.Database(dbPath);

const email = process.argv[2];

if (!email) {
    console.log('Usage: node make_admin.js <email>');
    console.log('Example: node make_admin.js user@example.com');
    process.exit(1);
}

db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
        console.error('Database error:', err);
        process.exit(1);
    }
    
    if (!user) {
        console.error('User not found with email:', email);
        process.exit(1);
    }
    
    if (user.role === 'admin') {
        console.log('User is already an admin');
        process.exit(0);
    }
    
    db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', email], function(err) {
        if (err) {
            console.error('Error updating user role:', err);
            process.exit(1);
        }
        
        console.log(`✅ User ${email} is now an admin!`);
        console.log('They can now access the admin panel at /admin.html');
        db.close();
    });
});