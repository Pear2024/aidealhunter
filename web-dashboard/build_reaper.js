const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/pear/Documents/AntiGravity/Ai news/AI_Deal_Hunter/web-dashboard/.env.local' });

async function buildReaper() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 20007,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await connection.execute("ALTER TABLE normalized_deals ADD COLUMN locked_at TIMESTAMP NULL;");
        console.log("Added locked_at column for Stale Lock detection.");
    } catch (e) { console.log(e.message); }

    await connection.end();
}

buildReaper();
