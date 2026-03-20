const cheerio = require('cheerio'); 
async function get() { 
    try {
        const res = await fetch('https://slickdeals.net/f/19324920-420-91-apple-watch-ultra-2-gps-cellular-49mm-renewed-premium-titanium-case-with-white-ocean-band-at-amazon', {
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        }); 
        const html = await res.text(); 
        const $ = cheerio.load(html); 
        let rawAmazonUrl = null; 
        $('a').each((i, el) => { 
            const href = $(el).attr('href'); 
            if (href && href.includes('u2=')) { 
                const decoded = decodeURIComponent(href.split('u2=')[1]);
                if (decoded.includes('amazon.com')) rawAmazonUrl = decoded;
            } 
        }); 
        console.log('Extracted Amazon URL:', rawAmazonUrl); 
    } catch(e) { console.error(e); }
} 
get();
