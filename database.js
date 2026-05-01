const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Drop the old table to add new region columns (as approved by user)
        db.run(`DROP TABLE IF EXISTS estimations`, () => {
            // Create the estimations table with region fields
            db.run(`CREATE TABLE IF NOT EXISTS estimations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL,
                trees_planted INTEGER NOT NULL,
                species_index INTEGER NOT NULL,
                species_name TEXT,
                duration INTEGER NOT NULL,
                survival_rate INTEGER NOT NULL,
                region_name TEXT,
                region_multiplier REAL,
                effective_trees INTEGER,
                annual_co2 REAL,
                total_co2 REAL,
                carbon_credits REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }
});

module.exports = db;
