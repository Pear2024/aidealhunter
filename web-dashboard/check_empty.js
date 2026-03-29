const { getConnection } = require('./lib/db');
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT count(*) as c FROM normalized_deals');
    console.log("Deals Count:", rows[0].c);

    // Also let's check what deals are actually there if count > 0
    if (rows[0].c > 0) {
       const [data] = await connection.query('SELECT title FROM normalized_deals LIMIT 5');
       console.log("Existing deals:", data.map(d => d.title));
    }

    // Force deletion again just in case
    console.log("Forcing a brutal wipe now just to be sure... SET FOREIGN_KEY_CHECKS = 0;");
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('DELETE FROM deals;').catch(e=>{});
    await connection.query('DELETE FROM votes;').catch(e=>{});
    await connection.query('TRUNCATE TABLE normalized_deals;').catch(e=>console.log(e.message));
    await connection.query('DELETE FROM normalized_deals;').catch(e=>console.log(e.message));
    await connection.query('DELETE FROM agent_logs;').catch(e=>{});
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log("Brutal wipe finished.");
    
    // Verify count again
    const [rows2] = await connection.query('SELECT count(*) as c FROM normalized_deals');
    console.log("Deals Count after wipe:", rows2[0].c);
    
    connection.end();
    process.exit(0);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
run();
