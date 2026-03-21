const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });
    
    const [deals] = await conn.execute("SELECT id, title, status FROM normalized_deals ORDER BY id DESC LIMIT 5");
    console.log("LATEST DEALS:");
    console.table(deals);
    
    const [approved] = await conn.execute("SELECT count(*) as c FROM normalized_deals WHERE status='approved'");
    console.log("TOTAL APPROVED DEALS:", approved[0].c);

    const [unblooged] = await conn.execute("SELECT count(*) as c FROM normalized_deals WHERE status = 'approved' AND id NOT IN (SELECT source_deal_id FROM ai_blog_posts WHERE source_deal_id IS NOT NULL)");
    console.log("APPROVED DEALS NOT BLOGGED YET:", unblooged[0].c);

    await conn.end();
}
check();
