require('dotenv').config({ path: '.env.local' });

async function testCron() {
    const secret = process.env.CRON_SECRET_KEY;
    console.log("Triggering local Envato Agent cron simulation...");
    try {
        const res = await fetch('http://localhost:3000/api/cron/envato', {
            headers: { 'Authorization': `Bearer ${secret}` }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error("Test failed:", e);
    }
}
testCron();
