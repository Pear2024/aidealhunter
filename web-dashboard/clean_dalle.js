require('dotenv').config({ path: '/Users/pear/Documents/AntiGravity/Ai news/AI_Deal_Hunter/web-dashboard/.env.local' });
const mysql = require('mysql2/promise');

async function clean() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });
    const [res] = await conn.execute("DELETE FROM ai_blog_posts WHERE image_url LIKE '%oaidalleapi%'");
    console.log('Deleted rows:', res.affectedRows);
    await conn.end();
}
clean();
