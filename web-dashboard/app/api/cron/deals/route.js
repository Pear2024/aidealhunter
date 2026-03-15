import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed for hobby

export async function GET(request) {
  let connection;
  try {
    // 1. Secret Key Auth
    const { searchParams } = new URL(request.url);
    const providedKey = searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.CRON_SECRET_KEY;

    const isAuthorized = (secretKey && providedKey === secretKey) || (secretKey && authHeader === `Bearer ${secretKey}`);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const withRetry = async (fn, maxRetries = 2, delayMs = 1000) => {
        for (let i = 0; i <= maxRetries; i++) {
            try { return await fn(); }
            catch (err) {
                if (i === maxRetries) throw err;
                await new Promise(res => setTimeout(res, delayMs * (i + 1)));
            }
        }
    };

    connection = await getConnection();
    
    console.log("🚀 Starting Serverless Scraper (Fast Regex Mode)...");

    const parser = new Parser({ 
        customFields: { item: ['media:content', 'image'] },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
    });
    
    // Choose one category at random to limit execution time
    const CATEGORIES = ['gaming', 'apple', 'tv', 'headphones', 'monitor'];
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const url = `https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=${randomCategory}`;
    console.log(`📡 Fetching RSS: ${url}`);
    
    let feed;
    try { feed = await parser.parseURL(url); } 
    catch(e) { return NextResponse.json({ error: 'RSS fetch failed', details: e.message }, { status: 500 }); }
    
    // Process top 3 newest deals
    const items = feed.items.slice(0, 3);
    let dealsAdded = 0;
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    for (const deal of items) {
        console.log(`⚙️ Processing: ${deal.title}`);
        let rawId;
        try {
            const [rawResult] = await connection.execute(
              `INSERT INTO raw_deals (source_url, title, raw_content, published_at) VALUES (?, ?, ?, NOW())`,
              [deal.link, deal.title, deal.content || '']
            );
            rawId = rawResult.insertId;
        } catch(e) { 
            console.log("➡️ Skipped (Already in DB)");
            continue; 
        } // Skip duplicates
        
        let extracted = { should_approve: false, confidence_score: 0.95 };
        
        try {
            const priceMatch = deal.title.match(/\$([0-9,.]+)/);
            if (priceMatch) {
                extracted.discount_price = parseFloat(priceMatch[1].replace(/,/g, ''));
                const installmentMatch = deal.title.match(/(?:Or\s)?(\$[0-9.,]+\/mo(?:\s\([0-9]+\s*mo\))?)/i);
                if (installmentMatch) extracted.installment_plan = installmentMatch[1];
                extracted.title = deal.title.replace(/\$([0-9,.]+)/, '').replace(/(?:Or\s)?(\$[0-9.,]+\/mo(?:\s\([0-9]+\s*mo\))?)/i, '').replace(/ at Amazon| at Best Buy| at Walmart| at Target/i, '').trim();
                extracted.should_approve = true;
            }
        } catch(e) { continue; }
        
        let fallbackImg = url.includes('apple') ? 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800' :
                          url.includes('tv') ? 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800' :
                          'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800';
                          
        let extractedImage = null;
        const htmlContent = deal['content:encoded'] || deal.content || '';
        if (htmlContent) {
            try {
                const $ = cheerio.load(htmlContent);
                const imgSrc = $('img').first().attr('src');
                if (imgSrc) extractedImage = imgSrc;
            } catch(e) {}
        }
        const finalImg = extractedImage || fallbackImg;

        if (extracted.should_approve && extracted.discount_price) {
            const [insertResult] = await connection.execute(`
                INSERT INTO normalized_deals 
                (raw_deal_id, title, brand, original_price, discount_price, url, image_url, status, confidence_score, merchandiser_score, vote_score, installment_plan, submitter_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, 'system')
            `, [
                rawId, extracted.title.substring(0, 100), 'Unknown', null, extracted.discount_price, deal.link, finalImg,
                0.95, Math.floor(Math.random() * 80) + 10, Math.floor(Math.random() * 50) + 5, extracted.installment_plan || null
            ]);
            
            dealsAdded++;
            const insertedDealId = insertResult.insertId;
            console.log(`✅ Approved Deal ID: ${insertedDealId}`);

            // ----- Agent 3: Copywriter & FB API -----
            try {
                console.log("✍️ Generating FB copy...");
                const copywriterPrompt = `
                  Act as an expert social media copywriter. Write a highly engaging, "thumb-stopping" Facebook post caption for a deal.
                  Deal Title: ${extracted.title}
                  Price: $${extracted.discount_price}
                  Rules: Keep it concise (3-4 sentences max), use 2-3 emojis, NO links in body, Include #Ad or #CommissionsEarned at the end.
                `;
                let caption = `💥 DEALS ALERT! 💥\\n\\n${extracted.title}\\n\\n💸 NOW ONLY: $${extracted.discount_price}\\n🛒 Hurry and grab yours here: ${deal.link}\\n\\n#Ad`;
                
                try {
                    const copyResult = await withRetry(() => textModel.generateContent(copywriterPrompt), 1, 1000); // Only 1 retry, fast timeout
                    const generatedText = copyResult.response.text().trim();
                    if (generatedText) caption = `${generatedText}\\n\\n🛒 Grab Deal Here: ${deal.link}`;
                } catch(e) { console.error("Gemini FB copy failed, using fallback."); }
                
                let useFormData = false;
                let fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: caption, link: deal.link })
                });
                const fbResult = await fbResponse.json();
                if (!fbResult.error && fbResult.id) {
                     await connection.execute('UPDATE normalized_deals SET fb_post_id = ? WHERE id = ?', [fbResult.id, insertedDealId]);
                     console.log(`🚀 Published to FB (ID: ${fbResult.id})`);
                } else {
                     console.error("Facebook API Error:", fbResult.error?.message);
                }
             } catch(err) {
                 console.error("Facebook Post Flow Error:", err.message);
             } 
             
             // Sleep 1 second to breathe between deals
             await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    console.log(`✅ Serverless Scraper Finished. Added ${dealsAdded} deals.`);
    return NextResponse.json({ success: true, added: dealsAdded });
    
  } catch (error) {
    console.error("Fatal Cron Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) {
       try { await connection.end(); } catch(e) {}
    }
  }
}
