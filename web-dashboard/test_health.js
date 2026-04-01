require('dotenv').config({ path: '.env.local' });
const { GET } = require('./.next/server/app/api/cron/health-content/route.js');

async function test() {
    console.log("Starting local test of Health Content Cron...");
    const req = {
        url: 'http://localhost:3000/api/cron/health-content',
        headers: new Headers(),
    };
    try {
        const response = await GET(req);
        if (response && response.json) {
            const data = await response.json();
            console.log("Cron Result:", data);
        } else {
            console.log("Cron returned:", response);
        }
    } catch (e) {
        console.error("Test Error:", e);
    }
}

test();
