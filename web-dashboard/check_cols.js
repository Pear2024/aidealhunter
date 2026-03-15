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
    const [cols] = await connection.execute("SHOW COLUMNS FROM normalized_deals");
    console.log(cols.map(c => c.Field));
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await connection.end();
  }
}

init();
