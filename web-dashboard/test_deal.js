require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });
    
    // The exact query fetch_approved_deal runs:
    const [deals] = await conn.execute(
        `SELECT * FROM normalized_deals WHERE status = 'approved' AND id NOT IN (SELECT source_deal_id FROM ai_blog_posts WHERE source_deal_id IS NOT NULL) ORDER BY merchandiser_score DESC, created_at DESC LIMIT 1`
    );
    console.log("Agent Deal Found:", deals.length > 0 ? deals[0].id : "NONE");
    
    // Check total approved
    const [total] = await conn.execute("SELECT count(*) as c FROM normalized_deals WHERE status = 'approved'");
    console.log("Total approved:", total[0].c);

    // Check ai_blog_posts
    const [blogs] = await conn.execute("SELECT source_deal_id FROM ai_blog_posts");
    console.log("Blog deal IDs:", blogs.map(b => b.source_deal_id));

    await conn.end();
}
check();
