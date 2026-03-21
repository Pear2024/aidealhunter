require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function migrate() {
    console.log("Connecting to DB...");
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    try {
        await conn.execute("ALTER TABLE normalized_deals ADD COLUMN category VARCHAR(50) DEFAULT 'general'");
        console.log("✅ Added category column successfully!");
    } catch(err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("✅ Category column already exists.");
        } else {
            console.error("Migration failed:", err.message);
        }
    }
    
    // Check columns
    const [cols] = await conn.execute("SHOW COLUMNS FROM normalized_deals");
    console.log("Current Columns:", cols.map(c => c.Field));
    await conn.end();
}
migrate();
