const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/pear/Documents/AntiGravity/Ai news/AI_Deal_Hunter/web-dashboard/.env.local' });

async function refactorDB() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 20007,
        ssl: { rejectUnauthorized: false }
    });

    try { console.log("Adding fb_status..."); await connection.execute("ALTER TABLE normalized_deals ADD COLUMN fb_status ENUM('idle', 'processing', 'published', 'failed') DEFAULT 'idle';"); } catch(e) {}
    try { console.log("Adding blog_status..."); await connection.execute("ALTER TABLE normalized_deals ADD COLUMN blog_status ENUM('idle', 'processing', 'published', 'failed') DEFAULT 'idle';"); } catch(e) {}

    try {
        console.log("Migrating boolean data to ENUM...");
        await connection.execute("UPDATE normalized_deals SET fb_status = 'processing' WHERE is_fb_posted = TRUE AND locked_at IS NOT NULL");
        await connection.execute("UPDATE normalized_deals SET fb_status = 'published' WHERE is_fb_posted = TRUE AND locked_at IS NULL");
        await connection.execute("UPDATE normalized_deals SET blog_status = 'processing' WHERE is_blog_posted = TRUE AND locked_at IS NOT NULL");
        await connection.execute("UPDATE normalized_deals SET blog_status = 'published' WHERE is_blog_posted = TRUE AND locked_at IS NULL");
    } catch(e) { console.error("Migration err:", e.message) }

    try { console.log("Dropping old is_fb_posted..."); await connection.execute("ALTER TABLE normalized_deals DROP COLUMN is_fb_posted;"); } catch(e) {}
    try { console.log("Dropping old is_blog_posted..."); await connection.execute("ALTER TABLE normalized_deals DROP COLUMN is_blog_posted;"); } catch(e) {}

    console.log("Migration Complete!");
    await connection.end();
}

refactorDB();
