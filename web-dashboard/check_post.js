require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: true }
    });
    
    const [rows] = await conn.execute('SELECT title, image_url FROM ai_blog_posts ORDER BY id DESC LIMIT 2');
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
}
check();
