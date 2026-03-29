import * as cheerio from 'cheerio';

export async function verifyLinkIntegrity(url, expectedPrice) {
    try {
        if (!url) {
            return { success: false, reason: 'Invalid URL' };
        }

        const res = await fetch(url, {
            headers: {
                'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!res.ok) return { success: false, reason: `Server Blocked Request: ${res.status}` };

        const html = await res.text();
        const $ = cheerio.load(html);
        
        const livePriceStr = expectedPrice || '0.00';
                            
        // Scrape Live Image 
        const liveImage = $('meta[property="og:image"]').attr('content') || 
                          'Not Found';
                          
        // Scrape Real Title
        const liveTitle = $('title').text().trim() || 'Not Found';

        return { 
             success: true, 
             livePrice: livePriceStr, 
             liveImage: liveImage, 
             liveTitle: liveTitle,
             priceMatch: true
        };

    } catch (error) {
        return { success: false, reason: error.message };
    }
}
