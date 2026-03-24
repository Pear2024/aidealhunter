import * as cheerio from 'cheerio';

export async function verifyAmazonIntegrity(url, expectedPrice) {
    try {
        if (!url || (!url.includes('amazon.com') && !url.includes('amzn.to'))) {
            return { success: false, reason: 'Not an Amazon URL' };
        }

        const res = await fetch(url, {
            headers: {
                'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!res.ok) return { success: false, reason: `Amazon Blocked Request: ${res.status}` };

        const html = await res.text();
        const $ = cheerio.load(html);
        
        // Scrape Live Price
        let livePriceStr = $('#corePriceDisplay_desktop_feature_div .a-price-whole').first().text().replace(/[^0-9]/g, '') ||
                           $('#priceblock_ourprice').text().replace(/[^0-9.]/g, '') ||
                           $('.a-price .a-offscreen').first().text().replace(/[^0-9.]/g, '') || 
                           'Unknown';
                           
        if (livePriceStr !== 'Unknown' && !livePriceStr.includes('.')) {
             const fraction = $('#corePriceDisplay_desktop_feature_div .a-price-fraction').first().text() || '00';
             livePriceStr = `${livePriceStr}.${fraction}`;
        }

        // Scrape Live Image 
        const liveImage = $('#landingImage').attr('src') || 
                          $('#imgBlkFront').attr('src') || 
                          $('meta[property="og:image"]').attr('content') || 
                          'Not Found';
                          
        // Scrape Real Title
        const liveTitle = $('#productTitle').text().trim() || $('title').text().trim() || 'Not Found';

        let priceMatch = false;
        if (expectedPrice && livePriceStr !== 'Unknown') {
             priceMatch = Math.abs(parseFloat(expectedPrice) - parseFloat(livePriceStr)) < 1.0; 
        }

        return { 
             success: true, 
             livePrice: livePriceStr, 
             liveImage: liveImage, 
             liveTitle: liveTitle,
             priceMatch: expectedPrice ? priceMatch : null
        };

    } catch (error) {
        return { success: false, reason: error.message };
    }
}
