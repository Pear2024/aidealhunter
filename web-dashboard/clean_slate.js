const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: true }
    });
    console.log("🧹 Connected to DB. Wiping the slate clean...");
    try {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('TRUNCATE TABLE ai_blog_posts');
        await connection.execute('TRUNCATE TABLE normalized_deals');
        
        // Wipe legacy tables just in case they hold old cruft
        try { await connection.execute('TRUNCATE TABLE deals'); } catch(e){}
        try { await connection.execute('TRUNCATE TABLE raw_deals'); } catch(e){}
        
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log("✅ All old products and blogs have been obliterated.");
    } catch(e) {
        console.error("❌ Error truncating tables:", e);
    }
    await connection.end();
}

run();
