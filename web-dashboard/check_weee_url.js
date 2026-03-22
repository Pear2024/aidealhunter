const cheerio = require('cheerio');

async function scrapeWeeeProduct(url) {
    console.log(`Scraping Weee! Product URL: ${url}`);
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        if (!res.ok) {
            console.log("Failed to fetch. Status:", res.status);
            return;
        }

        const html = await res.text();
        console.log(`Fetched ${html.length} bytes of HTML.`);
        
        const $ = cheerio.load(html);
        
        // Try to extract Open Graph metadata, as SPA sites usually render these server-side for SEO
        const title = $('meta[property="og:title"]').attr('content') || $('title').text();
        const image = $('meta[property="og:image"]').attr('content');
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        
        console.log("=== SCRAPED METADATA ===");
        console.log("Title:", title);
        console.log("Image:", image);
        console.log("Desc:", description);

        // Try to find the price (might be dynamically rendered, but let's check structured data)
        const ldJson = $('script[type="application/ld+json"]').html();
        if(ldJson) {
            try {
                const schema = JSON.parse(ldJson);
                console.log("Found LD-JSON Schema:", schema['@type'] ? schema['@type'] : 'Unknown type');
                if(schema.offers && schema.offers.price) {
                     console.log("Extracted Price from JSON:", schema.offers.price);
                }
            } catch(e) {}
        }
        
    } catch(e) {
        console.error("Scraping Error:", e);
    }
}

scrapeWeeeProduct('https://www.sayweee.com/en/product/Thai-Young-Coconut-9ct/2052');
