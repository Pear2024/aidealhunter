const cheerio = require('cheerio');

async function testPrice() {
    console.log("Fetching Champagne Mango...");
    const htmlRes = await fetch('https://www.sayweee.com/en/product/Yellow-Mango/33585', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    let ldJsonPrice = 'Not Found';
    const ldJson = $('script[type="application/ld+json"]').html();
    if (ldJson) {
        try {
            const schema = JSON.parse(ldJson);
            if (schema.offers) {
                if (schema.offers.price) ldJsonPrice = schema.offers.price;
                else if (Array.isArray(schema.offers) && schema.offers[0].price) ldJsonPrice = schema.offers[0].price;
            }
        } catch (e) {
             ldJsonPrice = 'Parse Error';
        }
    }
    
    // Fallback regex scraping from scripts
    const scriptMatch = html.match(/"price":\s*(\d+\.\d+)/);
    const regexPrice = scriptMatch ? scriptMatch[1] : 'Not Found';

    console.log("LD+JSON Price:", ldJsonPrice);
    console.log("Regex Price:", regexPrice);
    
    // Try to find it in the visible text
    console.log("Text match:", html.includes('15.88'));
}
testPrice();
