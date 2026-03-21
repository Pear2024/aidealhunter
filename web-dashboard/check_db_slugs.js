require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function test() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    });

    const [rows] = await conn.execute("SELECT slug, title FROM ai_blog_posts");
    console.log(rows);
    await conn.end();
}
test();
