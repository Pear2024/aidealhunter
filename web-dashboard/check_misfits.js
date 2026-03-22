const cheerio = require('cheerio');

async function probeMisfits() {
    console.log("Probing Misfits Market...");
    try {
        const res = await fetch('https://www.misfitsmarket.com/how-it-works', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await res.text();
        console.log(`Received ${html.length} bytes of HTML.`);
        
        const $ = cheerio.load(html);
        const title = $('title').text();
        console.log("Title:", title);
        
        // Let's see if there's any NEXT_DATA or product JSON injected in the head
        const nextData = $('#__NEXT_DATA__').html() || $('script[type="application/json"]').html();
        if(nextData) {
            console.log("Found JSON state chunk. Length:", nextData.length);
        } else {
            console.log("No JSON state found, might be a different framework.");
        }
        
        // Find links to collections or products
        const links = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if(href && (href.includes('/collections') || href.includes('/products'))) {
                links.push(href);
            }
        });
        console.log("Found Product/Collection Links:", [...new Set(links)].slice(0, 10));

    } catch(e) {
        console.error("Probe Failed:", e);
    }
}
probeMisfits();
