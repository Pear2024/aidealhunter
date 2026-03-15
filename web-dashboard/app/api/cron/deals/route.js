import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow Vercel Function to run for 60 seconds



export async function GET(request) {
  let connection;
  try {
    // 1. Secret Key Authentication
    const { searchParams } = new URL(request.url);
    const providedKey = searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.CRON_SECRET_KEY;

    const isAuthorized = (secretKey && providedKey === secretKey) || 
                         (secretKey && authHeader === `Bearer ${secretKey}`);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing Secret Key.' }, { status: 401 });
    }

    // 2. PHASE 10: AI Trend Analyst (Agent 0)
    const RETAILERS = ['amazon', 'walmart', 'target', 'costco', 'best buy'];
    const randomRetailer = RETAILERS[Math.floor(Math.random() * RETAILERS.length)];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use json generative model for Agent 0 & 1
    const jsonModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const trendPrompt = `
    You are an elite E-commerce Trend Analyst and Profit Strategist (Agent 11).
    Analyze current market trends, seasonality, and consumer impulse buying behavior.
    
    CRITICAL PROFIT OBJECTIVE:
    Prioritize product categories with HIGH Amazon Affiliate commission rates:
    - Luxury Beauty / Coins (10%)
    - Home / Furniture / Pet (8%)
    - Kitchen & Dining / Beauty / Apparel (5-6%)
    Limit keywords for low-margin categories like Video Games (1%) or Electronics/Computers (2-2.5%) unless there is a massive viral trend.
    
    Select ONE single, highly specific search keyword (e.g., 'espresso machine', 'korean skincare makeup', 'dyson vacuum') 
    that consumers are currently highly motivated to purchase and yields high commission.
    
    Respond ONLY with a valid JSON object matching this schema:
    { "keyword": "the chosen keyword" }
    `;
    
    let trendingKeyword = 'headphones'; // Fallback
    try {
        const trendResult = await jsonModel.generateContent(trendPrompt);
        const parsed = JSON.parse(trendResult.response.text().trim());
        if (parsed.keyword) trendingKeyword = parsed.keyword;
    } catch (e) {
        console.error("Agent 0 (Trendsetter) Error:", e);
    }
    console.log(`🤖 Cron Job Triggered: Agent 0 Selected [${trendingKeyword}] deals at [${randomRetailer}]...`);

    // 3. Fetch RSS Data (Strictly Top Retailers)
    const parser = new Parser();
    const encodedKeyword = encodeURIComponent(trendingKeyword + ' ' + randomRetailer);
    // Expand search scope from just 'frontpage' to 'popular' so we find more deals for specific retailers
    const rssUrl = `https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=${encodedKeyword}`;
    
    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (e) {
      console.error("RSS Fetch Error:", e);
      return NextResponse.json({ error: 'Failed to fetch RSS deals.' }, { status: 500 });
    }

    // Protect Gemini Limits: Only process the top 3 newest deals per execution
    const deals = feed.items.slice(0, 3);
    if (deals.length === 0) {
      return NextResponse.json({ message: `No recent deals found for [${trendingKeyword}].`, added: 0 });
    }

    connection = await getConnection();

    let addedCount = 0;

    // 4. Extract and Insert
    for (const deal of deals) {
      // Check if raw deal exists
      let rawId;
      try {
        const [result] = await connection.execute(
          `INSERT INTO raw_deals (source_url, title, raw_content, published_at) VALUES (?, ?, ?, ?)`,
          [deal.link, deal.title, deal.content || deal.contentSnippet || '', deal.pubDate || new Date().toISOString()]
        );
        rawId = result.insertId;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') continue;
        continue;
      }

      if (!rawId) continue;

      // Extract image URL early
      const rawContent = deal.content || deal.contentSnippet || '';
      let preExtractedImage = null;
      let deepPageText = ''; // Track full page text for QA Agent
      const imgMatch = rawContent.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        preExtractedImage = imgMatch[1];
      }

      // If no image in RSS string, deep scrape the destination URL
      if (!preExtractedImage && deal.link) {
        try {
          const pageRes = await fetch(deal.link, {
             headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            const $ = cheerio.load(html);
            deepPageText = $('body').text().replace(/\s+/g, ' ').substring(0, 15000); // 15k chars to limit token usage
            // 1. Try Open Graph first (standard for link sharing)
            preExtractedImage = $('meta[property="og:image"]').attr('content');
            // 2. Fallback to Twitter card
            if (!preExtractedImage) {
               preExtractedImage = $('meta[name="twitter:image"]').attr('content');
            }
            // 3. Last resort: Find the biggest/first meaningful image on the page
            if (!preExtractedImage) {
               const firstImg = $('img').not('[src$=".gif"], [src$=".svg"], .icon').first().attr('src');
               if (firstImg && firstImg.startsWith('http')) {
                  preExtractedImage = firstImg;
               }
            }
          }
        } catch (e) {
          console.error("Deep Image Scrape Error for link:", deal.link, e.message);
        }
      }

      // Gemini Extraction
      const prompt = `
      You are an AI Deal extraction agent. Extract the following deal information from the raw text provided.
      Return ONLY a valid JSON object matching the requested schema. Do not include markdown formatting or extra text.
      
      Raw text:
      Title: ${deal.title}
      Description: ${rawContent}
      
      Required JSON Schema:
      {
          "brand": "The brand of the product (string, e.g. 'Apple', or 'Unknown')",
          "original_price": "The original undiscounted price (number without $, e.g. 100.00). Use null if unknown.",
          "discount_price": "The current deal price (number without $, e.g. 50.00). Run regex/extract numbers.",
          "discount_percentage": "The percentage off (number, e.g. 50.00). Calculate if possible, or null.",
          "image_url": "Extract the primary image URL from the HTML description if it exists, otherwise null.",
          "confidence_score": "Your confidence in the extracted data from 0.0 to 1.0 (number)",
          "estimated_commission_rate": "Estimate Amazon commission rate based on category: 10 for Beauty, 8 for Home/Furniture, 5 for Kitchen/Apparel, 2.5 for Electronics/PC, 1 for Video Games. Defaults to 4. (number)"
      }
      `;

      let extractedData = null;
      try {
        const result = await model.generateContent(prompt);
        let textResult = result.response.text().trim();
        
        if (textResult.startsWith('```json')) textResult = textResult.substring(7, textResult.length - 3);
        else if (textResult.startsWith('```')) textResult = textResult.substring(3, textResult.length - 3);
        
        extractedData = JSON.parse(textResult);
      } catch (e) {
        console.error("Gemini Extraction Error:", e);
      }

      // Gatekeeper AI Heuristics (Phase 8)
      if (extractedData) {
        let finalStatus = 'pending';
        let rejectReasons = [];
        
        // 1. Calculate discount if not provided
        const computedDiscount = (extractedData.original_price && extractedData.discount_price) 
          ? Math.round((1 - extractedData.discount_price / extractedData.original_price) * 100) 
          : (extractedData.discount_percentage || null);

        // 2. Apply Rules (Tolerate missing MSRP from RSS chunks)
        if (computedDiscount !== null && computedDiscount < 15) rejectReasons.push('Discount < 15%');
        if ((extractedData.confidence_score || 0) < 0.60) rejectReasons.push('Low AI Confidence < 0.6');
        if (extractedData.brand === 'Unknown') rejectReasons.push('Unknown Brand');

        // 3. PHASE 9: AI Validator Check (QA Agent)
        if (rejectReasons.length === 0 && deepPageText) {
          const qaPrompt = `
          You are a strict QA Deal Validator. Your job is to verify NO hallucinations occurred.
          Check if the following extracted deal precisely matches the provided context from the deep scraped webpage.
          
          Deep Scraped Webpage Text:
          ${deepPageText}

          Extracted Deal to Verify:
          Title: ${deal.title}
          Discount Price: $${extractedData.discount_price}

          Respond ONLY with "PASS" if the price and deal context definitively exists in the text.
          Respond ONLY with "FAIL" if the price is wrong, missing, or the context does not match.
          `;
          try {
             const qaResult = await model.generateContent(qaPrompt);
             const qaDecision = qaResult.response.text().trim().toUpperCase();
             if (qaDecision.includes('FAIL')) {
                rejectReasons.push('Failed AI QA Validator (Price/Title Mismatch or Hallucination)');
             }
          } catch (e) {
             console.error("QA Agent Error:", e);
          }
        }


        // 3. Ruling
        if (rejectReasons.length === 0) {
          finalStatus = 'approved';
          console.log(`🟢 Gatekeeper Approved: [${deal.title}]`);
        } else {
          finalStatus = 'rejected';
          console.log(`🔴 Gatekeeper Rejected [${deal.title}] due to: ${rejectReasons.join(', ')}`);
        }

        try {
          // --- PHASE 21: Agent 11 (Profit Brain) EPC Calculation ---
          let profitScore = 0;
          if (extractedData.discount_price && extractedData.estimated_commission_rate) {
              profitScore = parseFloat((extractedData.discount_price * (extractedData.estimated_commission_rate / 100)).toFixed(2));
          }

          // Note: submitter_id is 'system' and status is decided by the Gatekeeper AI
          const [insertResult] = await connection.execute(
            `INSERT INTO normalized_deals (
                raw_deal_id, title, brand, original_price, discount_price, 
                discount_percentage, url, image_url, confidence_score, status, submitter_id, vote_score, profit_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system', 0, ?)`,
            [
              rawId,
              deal.title,
              extractedData.brand || 'Unknown',
              extractedData.original_price || null,
              extractedData.discount_price || null,
              computedDiscount || extractedData.discount_percentage || null,
              deal.link,
              preExtractedImage || extractedData.image_url || null,
              extractedData.confidence_score || 0.5,
              finalStatus,
              profitScore
            ]
          );
          
          const insertedDealId = insertResult.insertId;

          // --- FB AUTO-POSTING LOGIC (Phase 3 Integration) ---
          if (finalStatus === 'approved' && process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN) {
            try {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hemet-deals.vercel.app';
              const trackURL = `${baseUrl}/r/${insertedDealId}`;
              
              // PHASE 19: Agent 9 (The A/B Tester) dictates Agent 3 (The Hypeman Copywriter)
              const abVariants = ['Percentage Hook', 'Cash Saver Hook', 'Urgency Hook'];
              const chosenVariant = abVariants[Math.floor(Math.random() * abVariants.length)];
              
              let variantInstruction = "";
              if (chosenVariant === 'Percentage Hook') {
                  variantInstruction = "Focus heavily on the big discount percentage. Make them feel like this is a massive markdown.";
              } else if (chosenVariant === 'Cash Saver Hook') {
                  variantInstruction = "Focus directly on how much money ($) they are saving in their pocket. Relate it to what else they could buy with those savings.";
              } else {
                  variantInstruction = "Focus heavily on FOMO and urgency. Warn them that this deal is likely restocked for a limited time and will sell out today.";
              }

              const copywriterPrompt = `
              You are a world-class Social Media Marketer and Copywriter.
              Write a highly engaging, "thumb-stopping" Facebook post caption for a deal.
              
              Product: ${deal.title}
              Brand: ${extractedData.brand || 'Unknown'}
              Discount Price: $${parseFloat(extractedData.discount_price).toFixed(2)}
              Original Price: ${extractedData.original_price ? '$' + parseFloat(extractedData.original_price).toFixed(2) : 'Unknown'}
              Discount Percentage: ${computedDiscount}% OFF
              Affiliate Link: ${trackURL}
              
              Rules:
              1. A/B TEST VARIANT OBJECTIVE: ${variantInstruction}
              2. Keep it punchy, exciting, and easy to read.
              3. Use attractive emojis strategically (but don't overdo it).
              4. ALWAYS include the EXACT Affiliate Link provided above at the bottom with a clear Call to Action.
              5. Add 2-3 relevant hashtags at the end (e.g. #SmartShopper, #TrendingDeals).
              6. DO NOT use generic openings like "Hey everyone". Start with a bang!
              7. Output ONLY the raw caption text. Do not wrap in markdown or quotes.
              
              COMPLIANCE RULES (MANDATORY):
              8. You MUST include one of these hashtags at the very end of the post to comply with FTC guidelines: #Ad, #CommissionsEarned, or "As an Amazon Associate I earn from qualifying purchases."
              9. Do NOT make claims like "Lowest price ever!" or "Guaranteed cheapest!" as prices fluctuate. Use phrases like "Great price right now" or "Huge discount today".
              `;
              
              let caption = `💥 DEALS ALERT! 💥\n\n${deal.title}\n\n💸 NOW ONLY: $${parseFloat(extractedData.discount_price).toFixed(2)}\n🛒 Hurry and grab yours here: ${trackURL}`; // Fallback
              try {
                  const copyResult = await model.generateContent(copywriterPrompt);
                  const generatedCaption = copyResult.response.text().trim();
                  if (generatedCaption) {
                      caption = generatedCaption;
                  }
              } catch (e) {
                  console.error("Agent 3 (Copywriter) Error:", e);
              }

              
              const imageURL = preExtractedImage || extractedData.image_url;
              let useFormData = false;
              let formData = new FormData();

              if (imageURL) {
                try {
                  const imgRes = await fetch(imageURL, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
                  });
                  if (imgRes.ok) {
                    const blob = await imgRes.blob();
                    formData.append('source', blob, 'image.jpg');
                    formData.append('message', caption);
                    formData.append('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
                    useFormData = true;
                  }
                } catch (e) {
                  console.error('Failed to download image for FB:', e);
                }
              }

              let fbResponse;
              if (useFormData) {
                fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos`, {
                  method: 'POST',
                  body: formData
                });
              } else {
                fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: caption,
                    link: trackURL,
                    access_token: process.env.FB_PAGE_ACCESS_TOKEN
                  })
                });
              }
              
              let fbResult = await fbResponse.json();
              if (fbResult.error) {
                  console.error('Bot FB Post Error:', fbResult.error);
              } else {
                  console.log(`🤖 Bot Successfully Auto-Posted to FB [Variant: ${chosenVariant}]:`, fbResult.id);
                  // PHASE 17 & 19: Store fb_post_id and ab_variant for future analysis
                  await connection.execute('UPDATE normalized_deals SET fb_post_id = ?, ab_variant = ? WHERE id = ?', [fbResult.id, chosenVariant, insertedDealId]);
              }

            } catch (fbErr) {
              console.error('Bot FB Catch Block:', fbErr);
            }
          }

          await connection.execute('UPDATE raw_deals SET is_processed = TRUE WHERE id = ?', [rawId]);
          addedCount++;
        } catch (e) {
          console.error("Normalized DB Insert Error:", e);
        }
      }
    } // end loop

    // --- PHASE 13: Agent 4 (The Merchandiser) ---
    try {
        console.log("🤖 Agent 4 (Merchandiser) is evaluating the storefront...");
        const [activeDeals] = await connection.execute(
            `SELECT id, title, brand, vote_score, clicks, discount_percentage, profit_score 
             FROM normalized_deals 
             WHERE status = 'approved' 
             ORDER BY id DESC LIMIT 50`
        );
        
        if (activeDeals.length > 0) {
            const currentHour = new Date().getHours();
            let timeOfDay = 'Morning';
            if (currentHour >= 12 && currentHour < 17) timeOfDay = 'Afternoon';
            if (currentHour >= 17 && currentHour < 21) timeOfDay = 'Evening';
            if (currentHour >= 21 || currentHour < 5) timeOfDay = 'Night';

            const merchandiserPrompt = `
            You are an elite E-commerce Merchandiser and Storefront Manager.
            Review the following list of active deals on our storefront.
            Current Time of Day: ${timeOfDay}
            
            Evaluate each deal's potential to convert right now based on:
            1. Relevance to the time of day (e.g. TVs/Games score higher in evening, Coffee/Work gear in morning).
            2. Performance metrics: High votes or clicks should strongly boost the score.
            3. CRITICAL AI PROFIT BRAIN (Agent 11) RULE: Factor in the 'profit_score' (Estimated Net Commission). Deals that generate higher real profit dollars MUST score significantly higher than simple deep-discount deals.
            
            Assign a 'merchandiser_score' integer from 0 to 100 for each deal.
            
            Deals Data:
            ${JSON.stringify(activeDeals, null, 2)}
            
            Respond ONLY with a valid JSON array matching this schema:
            [ { "id": deal_id, "score": 85 }, ... ]
            `;

            const merchResult = await jsonModel.generateContent(merchandiserPrompt);
            const generatedText = merchResult.response.text().trim();
            const parsedScores = JSON.parse(generatedText.replace(/^```json|```$/g, ''));
            
            // Bulk update scores
            for (const item of parsedScores) {
               if (item.id && item.score !== undefined) {
                  await connection.execute(
                     'UPDATE normalized_deals SET merchandiser_score = ? WHERE id = ?',
                     [item.score, item.id]
                  );
               }
            }
            console.log(`✅ Agent 4 Restocked the Storefront: Updated ${parsedScores.length} items' merchandising scores.`);
        }
    } catch (e) {
        console.error("Agent 4 (Merchandiser) Error:", e.message);
    }

    // --- PHASE 14 & 15: Agent 5 & 6 (The Rechecker & OOS Killer) ---
    try {
        console.log("🤖 Agent 6 (OOS Killer) is patrolling existing deals...");
         const [dealsToCheck] = await connection.execute(
            `SELECT id, title, discount_price, url 
             FROM normalized_deals 
             WHERE status = 'approved' 
             ORDER BY RAND() LIMIT 5`
        );
        
        let expiredCount = 0;
        let hiddenCount = 0;
        for (const oldDeal of dealsToCheck) {
             try {
                 const res = await fetch(oldDeal.url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    signal: AbortSignal.timeout(8000),
                    redirect: 'follow'
                 });
                 if (!res.ok) {
                     await connection.execute("UPDATE normalized_deals SET status = 'hidden' WHERE id = ?", [oldDeal.id]);
                     console.log(`🥷 Agent 6 Assassinated Deal [${oldDeal.id}]: HTTP Error ${res.status}`);
                     hiddenCount++;
                     continue;
                 }
                 
                 const html = await res.text();
                 const $ = cheerio.load(html);
                 const pageText = $('body').text().replace(/\s+/g, ' ').substring(0, 15000);
                 
                 const recheckPrompt = `
                 You are an elite E-commerce Compliance Agent (The OOS Killer).
                 Review this raw webpage text for an existing deal we posted.
                 Target Product: ${oldDeal.title}
                 Target Discount Price: $${parseFloat(oldDeal.discount_price).toFixed(2)}
                 
                 Raw Text:
                 ${pageText}
                 
                 Task:
                 Verify if this deal is STILL active and provides a good user experience.
                 1. Does the text still show the target discount price?
                 2. Is the item in stock (e.g., no "Out of stock" or "Currently unavailable")?
                 3. Are there bad UX warnings like "Available from these sellers", "Select size to see price" where the target price is not immediately available to buy?
                 
                 Respond ONLY with "ACTIVE" if the exact price matches, it is in stock, and the buy box is immediately available.
                 Respond ONLY with "EXPIRED" if the price has simply changed or it's out of stock normally.
                 Respond ONLY with "HIDDEN" if it exhibits bad UX (Third-party sellers took over, requires selecting sizes that are out of stock, misleading price loops).
                 `;
                 
                 const recheckResult = await model.generateContent(recheckPrompt);
                 const statusDecision = recheckResult.response.text().trim().toUpperCase();
                 
                 if (statusDecision.includes('HIDDEN')) {
                     await connection.execute("UPDATE normalized_deals SET status = 'hidden' WHERE id = ?", [oldDeal.id]);
                     console.log(`🥷 Agent 6 Assassinated Deal [${oldDeal.id}]: Bad UX / Bait & Switch.`);
                     hiddenCount++;
                 } else if (statusDecision.includes('EXPIRED')) {
                     await connection.execute("UPDATE normalized_deals SET status = 'expired' WHERE id = ?", [oldDeal.id]);
                     console.log(`❌ Agent 5 Expired Deal [${oldDeal.id}]: Price changed or out of stock.`);
                     expiredCount++;
                 }
             } catch (e) {
                 console.log(`Agent 6 could not scrape URL for deal ${oldDeal.id}: ${e.message}. Marking as hidden.`);
                 await connection.execute("UPDATE normalized_deals SET status = 'hidden' WHERE id = ?", [oldDeal.id]);
                 hiddenCount++;
             }
        }
        if (expiredCount > 0 || hiddenCount > 0) {
            console.log(`✅ Patrol Complete: Removed ${expiredCount} expired and assassinated ${hiddenCount} hidden deals.`);
        } else if (dealsToCheck.length > 0) {
            console.log(`✅ Patrol Complete: All checked deals are still active and safe.`);
        }
    } catch (e) {
        console.error("Agent 6 (OOS Killer) Error:", e.message);
    }

    // --- PHASE 20: Agent 10 (The Taste Profiler) ---
    try {
        console.log("🧠 Agent 10 (Taste Profiler) is analyzing visitor clicks...");
        
        // Find up to 10 visitors who have clicks
        const [visitors] = await connection.execute(`
            SELECT v.visitor_id, v.segment 
            FROM visitor_profiles v
            JOIN visitor_clicks c ON v.visitor_id = c.visitor_id
            GROUP BY v.visitor_id
            ORDER BY RAND() LIMIT 10
        `);

        let profiledCount = 0;
        for (const visitor of visitors) {
            // Fetch last 10 clicks for this visitor
            const [clicks] = await connection.execute(`
                SELECT d.title, d.brand, d.discount_price, d.url
                FROM visitor_clicks c
                JOIN normalized_deals d ON c.deal_id = d.id
                WHERE c.visitor_id = ?
                ORDER BY c.clicked_at DESC LIMIT 10
            `, [visitor.visitor_id]);

            if (clicks.length > 0) {
                const profilerPrompt = `
                You are a Consumer Psychology Expert.
                Analyze the last 10 products that this visitor clicked on to build a buyer persona.
                
                Click History:
                ${JSON.stringify(clicks, null, 2)}
                
                Based on the brand, category, price range, and retailer, assign exactly ONE dominant behavioral segment from this list:
                "Apple under $100", "Kitchen moms", "Clearance hunters", "Best Buy electronics lovers", "High-End Tech", "Budget Audio", "Fashion & Apparel", "General Bargain Hunter".
                If none fit perfectly, invent ONE short segment label (max 4 words) that perfectly describes their taste.
                
                Respond ONLY with the name of the segment. Do not use quotes or markdown.
                `;
                
                const profilerResult = await model.generateContent(profilerPrompt);
                const newSegment = profilerResult.response.text().trim();
                
                if (newSegment && newSegment !== visitor.segment) {
                    await connection.execute("UPDATE visitor_profiles SET segment = ? WHERE visitor_id = ?", [newSegment, visitor.visitor_id]);
                    console.log(`🧠 Agent 10 Re-profiled Visitor [...${visitor.visitor_id.slice(-6)}] as: "${newSegment}"`);
                    profiledCount++;
                }
            }
        }
        if (profiledCount > 0) {
            console.log(`✅ Profiling Complete: Updated segments for ${profiledCount} visitors.`);
        }
    } catch (e) {
        console.error("Agent 10 (Taste Profiler) Error:", e.message);
    }

    console.log(`🤖 Cron Job Completed: Added ${addedCount} new [${trendingKeyword}] deals to the pending queue.`);
    return NextResponse.json({ success: true, keyword: trendingKeyword, dealsAdded: addedCount });

  } catch (error) {
    console.error('Cron Execution Error:', error);
    return NextResponse.json({ error: 'Internal server error during automated processing' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
