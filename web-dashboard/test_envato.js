const token = 'LWs8xGqeJC5nMR0rNFtf3v3BQIx0O0SE';

async function getPopular() {
    const sites = ['themeforest', 'codecanyon'];
    for (const site of sites) {
        try {
            const res = await fetch(`https://api.envato.com/v1/market/popular:${site}.json`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            console.log(`\n\n=== POPULAR ON ${site.toUpperCase()} ===`);
            if (data.popular && data.popular.items_last_week) {
                const topItems = data.popular.items_last_week.slice(0, 3);
                topItems.forEach((item, idx) => {
                    console.log(`${idx+1}. ${item.item}`);
                    console.log(`   Price: $${item.cost} | Sales: ${item.sales}`);
                    console.log(`   Category: ${item.category}`);
                    console.log(`   URL: ${item.url}`);
                });
            }
        } catch(e) {
            console.error(`Error fetching ${site}:`, e);
        }
    }
}
getPopular();
