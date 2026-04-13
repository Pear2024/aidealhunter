require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false },
        multipleStatements: true
    });

    try {
        console.log("Installing migration... 2026_04_11_create_reel_performance_tables.sql");
        const sql = fs.readFileSync('2026_04_11_create_reel_performance_tables.sql', 'utf8');
        await conn.query(sql);
        console.log("Migration successful!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await conn.end();
    }
}

migrate();
