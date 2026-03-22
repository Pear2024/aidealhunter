require('dotenv').config({ path: '.env.local' });

async function getImpactDeals() {
    const sid = process.env.IMPACT_ACCOUNT_SID;
    const token = process.env.IMPACT_AUTH_TOKEN;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    console.log(`Pinging Impact Mediapartners API API for SID: ${sid}...`);

    try {
        // Fetch Promocodes
        const promoRes = await fetch(`https://api.impact.com/Mediapartners/${sid}/Promocodes.json`, {
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
        });
        const promoData = await promoRes.json();
        console.log("=== PROMOCODES ===");
        console.log(JSON.stringify(promoData, null, 2).substring(0, 1000));

        // Fetch Catalogs
        const catRes = await fetch(`https://api.impact.com/Mediapartners/${sid}/Catalogs.json`, {
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
        });
        const catData = await catRes.json();
        console.log("\n=== CATALOGS ===");
        console.log(JSON.stringify(catData, null, 2).substring(0, 1000));

    } catch(e) {
        console.error("Impact API Error:", e);
    }
}
getImpactDeals();
