require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

async function test() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 3306,
        ssl: { rejectUnauthorized: true }
    });

    const [deals] = await connection.execute(
        `SELECT * FROM normalized_deals WHERE status = 'approved' AND network = 'Amazon' AND (discount_price > 0 OR original_price > discount_price) ORDER BY profit_score DESC, id DESC LIMIT 20`
    );

    console.log("Deals found:", deals.length);
    if(deals.length > 0) {
        console.log("Top Deal:", deals[0].title);
        console.log("Profit Score:", deals[0].profit_score);
    }
    
    await connection.end();
}
test().catch(console.error);
