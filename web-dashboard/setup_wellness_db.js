require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function setup() {
    console.log("Connecting to Aiven MySQL to setup wellness_leads table...");
    try {
        const pool = mysql.createPool({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT,
            waitForConnections: true,
            connectionLimit: 5,
        });

        await pool.query(`
            CREATE TABLE IF NOT EXISTS wellness_leads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symptoms TEXT NOT NULL,
                duration VARCHAR(255) NOT NULL,
                lifestyle TEXT NOT NULL,
                ai_diagnosis TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Successfully created 'wellness_leads' table!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Database setup failed:", e);
        process.exit(1);
    }
}

setup();
