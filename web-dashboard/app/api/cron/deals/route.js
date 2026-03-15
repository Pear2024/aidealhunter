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
    You are an elite E-commerce Trend Analyst.
    Analyze current market trends, seasonality, and consumer impulse buying behavior.
    Select ONE single, highly specific search keyword (e.g., 'macbook pro', 'airpods', 'lego star wars') 
    that consumers are currently highly motivated to purchase.
    
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
          "confidence_score": "Your confidence in the extracted data from 0.0 to 1.0 (number)"
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
          // Note: submitter_id is 'system' and status is decided by the Gatekeeper AI
          await connection.execute(
            `INSERT INTO normalized_deals (
                raw_deal_id, title, brand, original_price, discount_price, 
                discount_percentage, url, image_url, confidence_score, status, submitter_id, vote_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system', 0)`,
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
              finalStatus
            ]
          );
          
          const insertedDealId = insertResult.insertId;

          // --- FB AUTO-POSTING LOGIC (Phase 3 Integration) ---
          if (finalStatus === 'approved' && process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN) {
            try {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hemet-deals.vercel.app';
              const trackURL = `${baseUrl}/r/${insertedDealId}`;
              
              const caption = `💥 AI BOT DEAL ALERT! 💥\n\n${deal.title}\n\n💸 NOW ONLY: $${parseFloat(extractedData.discount_price).toFixed(2)} ${extractedData.original_price ? `(Was $${parseFloat(extractedData.original_price).toFixed(2)} - Save ${computedDiscount}%!)` : ''}\n🛒 Hurry to grab this deal!\n\n👇 GRAB IT FAST: 👇\n${trackURL}\n\n#InlandEmpire #SmartShopper #TrendingDeals`;
              
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
              if (fbResult.error) console.error('Bot FB Post Error:', fbResult.error);
              else console.log('🤖 Bot Successfully Auto-Posted to FB:', fbResult.id);

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

    console.log(`🤖 Cron Job Completed: Added ${addedCount} new [${randomKeyword}] deals to the pending queue.`);
    return NextResponse.json({ success: true, keyword: randomKeyword, dealsAdded: addedCount });

  } catch (error) {
    console.error('Cron Execution Error:', error);
    return NextResponse.json({ error: 'Internal server error during automated processing' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
