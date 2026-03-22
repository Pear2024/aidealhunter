import { getConnection } from './lib/db.js';
require('dotenv').config({ path: '.env.local' });

async function fix() {
    let conn;
    try {
        conn = await getConnection();
        await conn.execute("DELETE FROM normalized_deals WHERE submitter_id = 'agent_envato'");
        console.log("Deleted old envato deals.");
    } catch(e) {
        console.error(e);
    } finally {
        if(conn) await conn.end();
    }
}
fix();
