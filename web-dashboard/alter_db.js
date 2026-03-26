const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/pear/Documents/AntiGravity/Ai news/AI_Deal_Hunter/web-dashboard/.env.local' });

async function alterDB() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 20007,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Adding State Machine columns to normalized_deals...");
        await connection.execute("ALTER TABLE normalized_deals ADD COLUMN is_fb_posted BOOLEAN DEFAULT FALSE;");
        console.log("Added is_fb_posted.");
    } catch (e) { console.log(e.message); }

    try {
        await connection.execute("ALTER TABLE normalized_deals ADD COLUMN is_blog_posted BOOLEAN DEFAULT FALSE;");
        console.log("Added is_blog_posted.");
    } catch (e) { console.log(e.message); }

    try {
        await connection.execute("ALTER TABLE normalized_deals ADD COLUMN fb_post_id VARCHAR(255) DEFAULT NULL;");
        console.log("Added fb_post_id.");
    } catch (e) { console.log(e.message); }

    // Sync current blog states
    try {
        await connection.execute("UPDATE normalized_deals n JOIN ai_blog_posts b ON n.id = b.source_deal_id SET n.is_blog_posted = TRUE;");
        console.log("Synced historic blog states.");
    } catch (e) { console.log(e.message); }

    await connection.end();
}

alterDB();
