require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function cleanDeals() {
    console.log("Connecting to database to clean up deals without images...");
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const [result] = await conn.execute(
            `DELETE FROM normalized_deals WHERE image_url IS NULL OR image_url = ''`
        );
        console.log(`Successfully deleted ${result.affectedRows} deals that had no images.`);
    } catch (e) {
        console.error("Failed to delete deals:", e);
    } finally {
        await conn.end();
    }
}
cleanDeals();
