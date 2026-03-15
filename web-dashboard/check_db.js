const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 25060,
  });

  try {
    const [deals] = await connection.execute(`SELECT count(*) as count FROM normalized_deals`);
    console.log("Total Deals in DB:", deals[0].count);
    
    const [pending] = await connection.execute(`SELECT count(*) as count FROM normalized_deals WHERE status='pending'`);
    console.log("Pending Deals:", pending[0].count);
    
    const [approved] = await connection.execute(`SELECT count(*) as count FROM normalized_deals WHERE status='approved'`);
    console.log("Approved Deals:", approved[0].count);
    
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await connection.end();
  }
}

init();
