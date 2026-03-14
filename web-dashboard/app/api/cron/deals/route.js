import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow Vercel Function to run for 60 seconds

// List of high-value trending keywords to randomize deal diversity
const TRENDING_KEYWORDS = [
  'apple', 'laptop', 'monitor', 'tv', 'sneakers', 'gaming',
  'headphones', 'ssd', 'smart home', 'coffee', 'lego',
  'nintendo', 'playstation', 'tools', 'kitchen'
];

export async function GET(request) {
  let connection;
  try {
    // 1. Secret Key Authentication
    const { searchParams } = new URL(request.url);
    const providedKey = searchParams.get('key');
    const secretKey = process.env.CRON_SECRET_KEY;

    if (!secretKey || providedKey !== secretKey) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing Secret Key.' }, { status: 401 });
    }

    // 2. Randomize Keyword Selection
    const randomKeyword = TRENDING_KEYWORDS[Math.floor(Math.random() * TRENDING_KEYWORDS.length)];
    console.log(`🤖 Cron Job Triggered: Searching for [${randomKeyword}] deals...`);

    // 3. Fetch RSS Data
    const parser = new Parser();
    const encodedKeyword = encodeURIComponent(randomKeyword);
    const rssUrl = `https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1&q=${encodedKeyword}`;
    
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
      return NextResponse.json({ message: `No recent deals found for [${randomKeyword}].`, added: 0 });
    }

    connection = await getConnection();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
      const imgMatch = rawContent.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        preExtractedImage = imgMatch[1];
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

      // Insert into Normalized DB
      if (extractedData) {
        try {
          // Note: submitter_id is 'system' and status is 'pending' so it requires your manual approval
          await connection.execute(
            `INSERT INTO normalized_deals (
                raw_deal_id, title, brand, original_price, discount_price, 
                discount_percentage, url, image_url, confidence_score, status, submitter_id, vote_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'system', 0)`,
            [
              rawId,
              deal.title,
              extractedData.brand || 'Unknown',
              extractedData.original_price || null,
              extractedData.discount_price || null,
              extractedData.discount_percentage || null,
              deal.link,
              preExtractedImage || extractedData.image_url || null,
              extractedData.confidence_score || 0.5
            ]
          );
          
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
