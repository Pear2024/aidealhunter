require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function migrate() {
    console.log("Connecting to Database...");
    
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS health_reels_queue (
                id INT AUTO_INCREMENT PRIMARY KEY,
                topic VARCHAR(500) UNIQUE NOT NULL,
                status ENUM('pending', 'posted', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                posted_at TIMESTAMP NULL
            )
        `);
        console.log("✅ Table health_reels_queue created successfully.");
    } catch(e) {
        console.error("❌ Migration Failed:", e.message);
    } finally {
        await conn.end();
    }
}
migrate();
