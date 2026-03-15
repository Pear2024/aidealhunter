const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function clearDB() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 25060,
  });

  try {
    console.log("Wiping database...");
    await connection.execute(`DELETE FROM votes`);
    await connection.execute(`DELETE FROM normalized_deals`);
    await connection.execute(`DELETE FROM raw_deals`);
    await connection.execute(`DELETE FROM agent_logs`);
    console.log("✅ Database cleared successfully!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await connection.end();
  }
}

clearDB();
