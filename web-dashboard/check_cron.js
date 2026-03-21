import fetch from 'node-fetch';

async function check() {
    console.log("Triggering Vercel Cron manually...");
    try {
        const response = await fetch('https://aidealhunter.vercel.app/api/cron/deals');
        const text = await response.text();
        console.log("STATUS:", response.status);
        console.log("RESPONSE:", text);
    } catch(e) {
        console.error(e);
    }
}
check();
