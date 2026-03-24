import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { url, expectedPrice } = await request.json();
        
        if (!url || (!url.includes('amazon.com') && !url.includes('amzn.to'))) {
            return NextResponse.json({ error: 'Only Amazon URLs are currently supported for live verification.' }, { status: 400 });
        }

        // We attempt a stealthy fetch to bypass Amazon basic bot blocks
        const res = await fetch(url, {
            headers: {
                'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Amazon blocked verification. Status: ${res.status}` }, { status: 502 });
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        
        // Scrape Live Price (Amazon constantly changes layout, we check multiple CSS selectors)
        let livePriceStr = $('#corePriceDisplay_desktop_feature_div .a-price-whole').first().text().replace(/[^0-9]/g, '') ||
                           $('#priceblock_ourprice').text().replace(/[^0-9.]/g, '') ||
                           $('.a-price .a-offscreen').first().text().replace(/[^0-9.]/g, '') || 
                           'Unknown';
                           
        if (livePriceStr !== 'Unknown' && !livePriceStr.includes('.')) {
             // Handle Amazon's 'fraction' split formatting if they only returned whole numbers
             const fraction = $('#corePriceDisplay_desktop_feature_div .a-price-fraction').first().text() || '00';
             livePriceStr = `${livePriceStr}.${fraction}`;
        }

        // Scrape Live Image (Landing image or OpenGraph)
        const liveImage = $('#landingImage').attr('src') || 
                          $('#imgBlkFront').attr('src') || 
                          $('meta[property="og:image"]').attr('content') || 
                          'Not Found';
                          
        // Scrape Real Title
        const liveTitle = $('#productTitle').text().trim() || $('title').text().trim() || 'Not Found';

        // Calculate discrepancy
        let priceMatch = false;
        if (expectedPrice && livePriceStr !== 'Unknown') {
             // Use robust comparison logic allowing for slight float rounding
             priceMatch = Math.abs(parseFloat(expectedPrice) - parseFloat(livePriceStr)) < 1.0; 
        }

        return NextResponse.json({ 
             success: true, 
             livePrice: livePriceStr, 
             liveImage: liveImage, 
             liveTitle: liveTitle,
             priceMatch: expectedPrice ? priceMatch : null
        });

    } catch (error) {
        console.error('Verification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
