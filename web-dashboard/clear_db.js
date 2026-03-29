const { getConnection } = require('./lib/db');
require('dotenv').config({ path: '.env.local' });

async function clearDb() {
    try {
        const connection = await getConnection();
        
        console.log("Disabling FK checks...");
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        
        console.log("Emptying 'deals' table...");
        await connection.query('DELETE FROM deals').catch(e => console.log(e.message));
        
        console.log("Emptying 'votes' table...");
        await connection.query('DELETE FROM votes').catch(e => console.log(e.message));
        
        console.log("Emptying 'normalized_deals' table...");
        await connection.query('DELETE FROM normalized_deals').catch(e => console.log(e.message));
        
        console.log("Emptying 'agent_logs' table...");
        await connection.query('DELETE FROM agent_logs').catch(e => console.log(e.message));
        
        console.log("Re-enabling FK checks...");
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        console.log("✅ Database wiped successfully for new Health content!");
        connection.end();
        process.exit(0);
    } catch(e) {
        console.error("Error wiping db:", e);
    }
}
clearDb();
