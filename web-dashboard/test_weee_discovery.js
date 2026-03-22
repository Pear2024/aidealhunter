const cheerio = require('cheerio');

async function discoverWeeeProducts() {
    console.log("Hunting for popular SayWeee products...");
    try {
        const res = await fetch('https://www.sayweee.com/robots.txt');
        const text = await res.text();
        console.log("=== robots.txt ===");
        console.log(text.split('\\n').filter(l => l.includes('sitemap') || l.includes('Sitemap')).join('\\n'));
        
        // Also try direct sitemap
        const siteRes = await fetch('https://www.sayweee.com/sitemap-en.xml');
        console.log("English Sitemap status:", siteRes.status);
        if(siteRes.ok) {
            const xml = await siteRes.text();
            console.log("Sitemap block preview:");
            console.log(xml.substring(0, 500));
            // Just count how many loc tags we have
            const count = (xml.match(/<loc>/g) || []).length;
            console.log(`Found ${count} location tags in sitemap-en.xml`);
        }

    } catch(e) {
        console.error("Discovery Error:", e);
    }
}
discoverWeeeProducts();
