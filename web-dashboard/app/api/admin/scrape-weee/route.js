import { NextResponse } from 'next/server';
import { getAuth } from "@clerk/nextjs/server";
import * as cheerio from 'cheerio';

export async function POST(req) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { url } = body;

        if (!url || !url.includes('sayweee.com')) {
            return NextResponse.json({ error: "Please enter a valid SayWeee URL" }, { status: 400 });
        }

        console.log(`[SayWeee Scraper] Fetching: ${url}`);
        
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Failed to fetch page. Status: ${res.status}` }, { status: 500 });
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        
        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Delicious Asian Grocery';
        const image = $('meta[property="og:image"]').attr('content') || '';
        
        let price = 'Current Market Price';
        const ldJson = $('script[type="application/ld+json"]').html();
        if(ldJson) {
            try {
                const schema = JSON.parse(ldJson);
                if(schema.offers && schema.offers.price) {
                     price = `$${schema.offers.price}`;
                }
            } catch(e) {}
        }

        // Clean up title (remove ' - Weee!' suffix if present)
        const cleanTitle = title.split(' - ')[0].replace(' | Weee!', '').trim();

        return NextResponse.json({
            title: cleanTitle,
            image: image,
            price: price,
            brand: 'SayWeee!',
            category: 'Groceries & Subs'
        });

    } catch (error) {
        console.error('[SayWeee Scraper Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
