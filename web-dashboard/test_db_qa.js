require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
async function run() {
    try {
        const c = await mysql.createConnection({
            host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, 
            password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, 
            port: process.env.MYSQL_PORT, ssl: {rejectUnauthorized: false}
        });
        const [r] = await c.query("SELECT id, title, discount_price, original_price, url FROM normalized_deals WHERE status='pending' LIMIT 3");
        console.log(JSON.stringify(r, null, 2));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
