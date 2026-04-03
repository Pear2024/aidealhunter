require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
async function check() {
    const pool = mysql.createPool({ host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, port: process.env.MYSQL_PORT });
    const [rows] = await pool.query("SELECT * FROM wellness_leads ORDER BY created_at DESC LIMIT 10");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}
check();
