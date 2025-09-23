const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/mydatabase.sqlite');

// Create table if not exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE
  )`);
});

exports.getAllUsers = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

exports.addUser = (name, email) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    stmt.run([name, email], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
    stmt.finalize();
  });
};
