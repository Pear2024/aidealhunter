const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await connection.execute('SELECT content_html FROM ai_blog_posts WHERE slug="dhp-junior-twin-metal-loft-bed-slide-deal"');
    console.log("------------ RAW HTML ------------");
    console.log(rows[0].content_html);
    console.log("----------------------------------");
    process.exit(0);
}
check();
