const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function seedLogs() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 25060,
  });

  try {
    console.log("Seeding agent logs...");

    const logs = [
      { id: 'agent_0', name: 'Agent 0: Trend Analyst', action: 'Keyword Analysis Run', status: 'success', details: 'Identified top 5 trending tech categories for the day.' },
      { id: 'agent_1', name: 'Agent 1: Data Scraper', action: 'Mass Ingestion', status: 'success', details: 'Scraped 100 fresh deals from Amazon and BestBuy.' },
      { id: 'agent_2', name: 'Agent 2: Validator', action: 'Data QA', status: 'success', details: 'Validated formatting and parsed price drops for 100 items.' },
      { id: 'agent_4', name: 'Agent 4: Merchandiser', action: 'Rankings Update', status: 'success', details: 'Calculated and assigned Merchandiser Scores for active deals.' },
      { id: 'agent_6', name: 'Agent 6: Gatekeeper', action: 'Auto-Approval', status: 'success', details: 'Approved 100 high-confidence deals to the live storefront.' },
      { id: 'agent_11', name: 'Agent 11: Profit Brain', action: 'Commission Sync', status: 'success', details: 'Verified affiliate tags and expected Amazon EPC rates.' }
    ];

    for (const log of logs) {
       await connection.execute(`
          INSERT INTO agent_logs (agent_id, agent_name, action, status, details)
          VALUES (?, ?, ?, ?, ?)
       `, [log.id, log.name, log.action, log.status, log.details]);
    }

    console.log(`✅ Successfully inserted Agent Logs!`);
    
  } catch (err) {
    console.error("❌ Error inserting logs:", err.message);
  } finally {
    await connection.end();
  }
}

seedLogs();
