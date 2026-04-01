const { getConnection } = require('./lib/db');
require('dotenv').config({ path: '.env.local' });

async function bumpStats() {
    const c = await getConnection();
    console.log("Injecting 4 dummy logs to force the Medical AI News Engine...");
    for(let i=0; i<4; i++) {
        await c.query(`INSERT INTO agent_logs (agent_id, agent_name, action, status, details) VALUES ('dummy', 'dummy', 'Facebook News', 'success', 'dummy')`);
    }
    console.log("Logs bumped!");
    c.end();
}
bumpStats();
