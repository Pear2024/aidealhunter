require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function fix() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    });

    console.log("Modifying column image_url to TEXT...");
    try {
        await conn.execute("ALTER TABLE ai_blog_posts MODIFY COLUMN image_url TEXT;");
        console.log("Success! Column expanded.");
    } catch (e) {
        console.error(e);
    }
    await conn.end();
}
fix();
