require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
async function test() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 25060,
    });
    const [cols] = await connection.execute("SHOW COLUMNS FROM normalized_deals");
    console.log("Real Columns:", cols.map(c => c.Field));
    await connection.end();
}
test();
