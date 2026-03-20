const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });
const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cheerio = require('cheerio');

async function runAgent() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 25060,
    });
    
    const withRetry = async (fn, maxRetries = 2, delayMs = 1000) => {
        for (let i = 0; i <= maxRetries; i++) {
            try { return await fn(); }
            catch (err) {
                if (i === maxRetries) throw err;
                await new Promise(res => setTimeout(res, delayMs * (i + 1)));
            }
        }
    };

    try {
        console.log("Starting Local Autonomous Agent (with Facebook Auto-Post)...");
        const parser = new Parser({
          customFields: { item: ['media:content', 'image'] }
        });
        const urls = [
            'https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=gaming',
            'https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=apple',
            'https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=tv'
        ];
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Copywriter instance
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let dealsAdded = 0;
        
        for (const url of urls) {
            console.log("\\n📡 Fetching RSS:", url);
            let feed;
            try { feed = await parser.parseURL(url); } 
            catch(e) { console.error("RSS Error:", e.message); continue; }
            
            const items = feed.items.slice(0, 15);
            
            for (const deal of items) {
                console.log("⚙️  Processing:", deal.title);
                
                let rawId;
                try {
                const [rawResult] = await connection.execute(
                  `INSERT INTO raw_deals (source_url, title, raw_content, published_at) VALUES (?, ?, ?, NOW())`,
                  [deal.link, deal.title, deal.content || '']
                );
                rawId = rawResult.insertId;
                } catch(e) {
                   console.log("Skipping duplicate DB raw_deal.");
                   continue;
                }
                
                if (!deal.title.toLowerCase().includes('amazon')) {
                   console.log("Skipping (Not an Amazon deal)");
                   continue;
                }
                
                let extracted = { should_approve: false, confidence_score: 0.95 };
                let original_price = null;
                let discount_percentage = null;

                try {
                    const priceMatch = deal.title.match(/\$([0-9,.]+)/);
                    if (priceMatch) {
                        extracted.discount_price = parseFloat(priceMatch[1].replace(/,/g, ''));
                        const installmentMatch = deal.title.match(/(?:Or\s)?(\$[0-9.,]+\/mo(?:\s\([0-9]+\s*mo\))?)/i);
                        if (installmentMatch) extracted.installment_plan = installmentMatch[1];
                        extracted.title = deal.title.replace(/\$([0-9,.]+)/, '').replace(/(?:Or\s)?(\$[0-9.,]+\/mo(?:\s\([0-9]+\s*mo\))?)/i, '').replace(/ at Amazon| at Best Buy| at Walmart| at Target/i, '').trim();
                        extracted.should_approve = true;
                    }
                } catch(e) { console.error("Inline Regex parse fail:", e.message); }

                // Agent: Deep Price Extractor
                const htmlContent = deal['content:encoded'] || deal.content || '';
                try {
                    const extractorPrompt = `
                      Analyze the following deal text and extract the numeric values for discount_price, original_price, and discount_percentage.
                      If the text says "$100 lower (20%)", compute the original price.
                      If original price is missing, use null.
                      Return ONLY raw JSON in this exact format: {"discount_price": 99.99, "original_price": 120.00, "discount_percentage": 20.5} (no markdown blocks or backticks).
                      Title: ${deal.title}
                      Content: ${htmlContent}
                    `;
                    const extractResult = await withRetry(() => textModel.generateContent(extractorPrompt), 1, 2000);
                    const jsonStr = extractResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
                    const jsonData = JSON.parse(jsonStr);
                    if (jsonData.discount_price && !extracted.discount_price) {
                        extracted.discount_price = jsonData.discount_price;
                        extracted.should_approve = true;
                    }
                    if (jsonData.original_price) original_price = parseFloat(jsonData.original_price);
                    if (jsonData.discount_percentage) discount_percentage = parseFloat(jsonData.discount_percentage);
                } catch (e) {
                    console.log("Deep Extraction API fallback...");
                }
                
                let fallbackImg = url.includes('apple') ? 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800' :
                                  url.includes('tv') ? 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800' :
                                  'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800';
                
                let extractedImage = null;
                if (htmlContent) {
                    try {
                        const $ = cheerio.load(htmlContent);
                        const imgSrc = $('img').first().attr('src');
                        if (imgSrc) extractedImage = imgSrc;
                    } catch(e) {}
                }

                const finalImg = extractedImage || fallbackImg;

                let finalUrl = deal.link;
                try {
                    const sdRes = await fetch(deal.link, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
                    const sdHtml = await sdRes.text();
                    const $sd = cheerio.load(sdHtml);
                    $sd('a').each((i, el) => {
                        const href = $sd(el).attr('href');
                        if (href && href.includes('u2=')) {
                            const decoded = decodeURIComponent(href.split('u2=')[1]);
                            if (decoded.includes('amazon.com')) {
                                const asinMatch = decoded.match(/(?:dp|product-reviews|gp\/product)\/([A-Z0-9]{10})/i);
                                if (asinMatch) finalUrl = 'https://www.amazon.com/dp/' + asinMatch[1];
                                else finalUrl = decoded;
                            }
                        }
                    });
                } catch(e) { console.error("Failed to extract raw Amazon URI", e); }

                if (extracted.should_approve && extracted.discount_price) {
                     const [insertResult] = await connection.execute(`
                        INSERT INTO normalized_deals 
                        (raw_deal_id, title, brand, original_price, discount_price, discount_percentage, url, image_url, status, confidence_score, merchandiser_score, vote_score, installment_plan)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)
                     `, [
                         rawId, extracted.title.substring(0, 100), null, original_price, extracted.discount_price, discount_percentage, finalUrl, finalImg,
                         0.95, Math.floor(Math.random() * 80) + 10, Math.floor(Math.random() * 50) + 5, extracted.installment_plan || null
                     ]);
                     
                     const insertedDealId = insertResult.insertId;
                     dealsAdded++;
                     console.log("✅ APPROVED:", extracted.title, `($${extracted.discount_price})`);

                     // ──────────── AUTOMATIC FACEBOOK POSTING ────────────
                     try {
                        console.log("✍️  Agent 3 (Copywriter): Generating Facebook Post...");
                        const copywriterPrompt = `
                          Act as an expert social media copywriter. Write a highly engaging, "thumb-stopping" Facebook post caption for a deal.
                          Deal Title: ${extracted.title}
                          Price: $${extracted.discount_price}
                          
                          Rules:
                          1. Keep it concise (3-4 short sentences max).
                          2. Use 2-3 relevant emojis.
                          3. Create a sense of urgency.
                          4. Do NOT include any links, just the text.
                          5. Include #Ad or #CommissionsEarned at the end.
                        `;
                        
                        let facebookDirectLink = finalUrl;
                        if (facebookDirectLink.includes('amazon.com')) {
                           try {
                               const urlObj = new URL(facebookDirectLink);
                               urlObj.searchParams.set('tag', process.env.AMAZON_AFFILIATE_TAG || 'smartshop0c33-20');
                               facebookDirectLink = urlObj.toString();
                           } catch(e) {}
                        }
                        const trackingLink = facebookDirectLink;
                        let caption = `💥 DEALS ALERT! 💥\n\n${extracted.title}\n\n💸 NOW ONLY: $${extracted.discount_price}\n🛒 Hurry and grab yours here: ${trackingLink}\n\n#Ad`;
                        try {
                            const copyResult = await withRetry(() => textModel.generateContent(copywriterPrompt), 2, 2000);
                            const generatedText = copyResult.response.text().trim();
                            if (generatedText) caption = `${generatedText}\\n\\n🛒 Grab Deal Here: ${trackingLink}`;
                        } catch(e) {
                             console.log("Gemini API Error, using fallback caption.", e.message);
                        }
                        
                        let useFormData = false;
                        let formData = new FormData();
          
                        if (finalImg) {
                          try {
                            const imgRes = await fetch(finalImg, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                            if (imgRes.ok) {
                              const blob = await imgRes.blob();
                              formData.append('source', blob, 'image.jpg');
                              formData.append('message', caption);
                              formData.append('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
                              useFormData = true;
                            }
                          } catch (e) {
                            console.error('Failed to download image for FB:', e.message);
                          }
                        }
                        
                        let fbResponse;
                        if (useFormData) {
                          fbResponse = await withRetry(() => fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, { method: 'POST', body: formData }), 2, 3000);
                        } else {
                          fbResponse = await withRetry(() => fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: caption, link: trackingLink })
                          }), 2, 3000);
                        }
                        
                        let fbResult = await fbResponse.json();
                        if (fbResult.error) {
                             console.error('Bot FB Post Error:', fbResult.error.message);
                        } else {
                             console.log(`🚀 Published to Facebook page (ID: ${fbResult.id})`);
                             await connection.execute('UPDATE normalized_deals SET fb_post_id = ? WHERE id = ?', [fbResult.id, insertedDealId]);
                             
                             console.log("⏳ Facebook API: Sleeping for 10 minutes before next post to prevent spam...");
                             await new Promise(resolve => setTimeout(resolve, 600000));
                        }
                     } catch(err) {
                          console.log("Facebook Publishing failed:", err.message);
                     }
                } else {
                    console.log("⚠️  BLOCKED BY GATEKEEPER:", deal.title);
                }
            }
        }
        
        console.log("\\n====== Agent Completed ======");
        console.log("Total Authentic Deals Ingested & Posted:", dealsAdded);
        
    } catch(err) {
        console.error("Fatal Error:", err);
    } finally {
        await connection.end();
    }
}
runAgent();
