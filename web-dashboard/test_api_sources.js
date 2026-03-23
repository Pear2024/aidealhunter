async function testYamibuy() {
    console.log("=== Testing Yamibuy Bestsellers ===");
    try {
        // Yamibuy often has a public GraphQL or REST endpoint for category fetching
        // Let's first try just fetching the category HTML and looking for JSON payloads
        const res = await fetch("https://www.yamibuy.com/en/c/snacks-sweets/12", {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const html = await res.text();
        
        // Search for window.__PRELOADED_STATE__ or similar
        const match = html.match(/window\.__NUXT__=(.*?);<\/script>/);
        if (match) {
            console.log("Found Nuxt state! Parsing...");
            const nuxtStr = match[1];
            // Look for generic item details if we can't fully execute eval
            const names = [...html.matchAll(/<a[^>]*title="([^"]+)"[^>]*href="\/en\/p\/[^"]+"/g)].map(m => m[1]);
            const prices = [...html.matchAll(/"price":"([\d\.]+)"/g)].map(m => m[1]);
            
            console.log("Yamibuy Titles:", names.slice(0, 5));
            console.log("Yamibuy Prices:", prices.slice(0, 5));
        } else {
            console.log("No Nuxt state found, trying fallback Regex extraction on raw DOM.");
            const names = [...html.matchAll(/<div class="item-title"[^>]*>(.*?)<\/div>/g)].map(m => m[1]);
            console.log("Fallback Titles found:", names.length);
        }
    } catch(e) { console.error("Yamibuy Error:", e.message); }
}

async function testInstacart() {
    console.log("\n=== Testing Instacart (99 Ranch / H-Mart) ===");
    try {
        // Instacart storefronts are heavily protected by Incapsula/Cloudflare, but let's try a public storefront HTML fetch
        const res = await fetch("https://www.instacart.com/store/99-ranch-market/storefront", {
             headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await res.text();
        console.log("Instacart Fetch Status:", res.status);
        if (html.includes("cf-browser-verification") || html.includes("Incapsula")) {
            console.log("Instacart is Blocking us via Cloudflare/Incapsula!");
        } else {
            const names = [...html.matchAll(/"name":"([^"]+)"/g)].map(m => m[1]).filter(n => n.includes(' '));
            console.log("Instacart Items found:", names.length, names.slice(0, 5));
        }

    } catch(e) { console.error("Instacart Error:", e.message); }
}

testYamibuy().then(testInstacart);
