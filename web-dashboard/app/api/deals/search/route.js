import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let connection;
  try {
    const { keyword } = await request.json();
    
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const parser = new Parser();
    const encodedKeyword = encodeURIComponent(keyword);
    // You can modify URLs for different searches. This is a generic query search.
    const rssUrl = `https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1&q=${encodedKeyword}`;
    
    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (e) {
      console.error("RSS Fetch Error:", e);
      return NextResponse.json({ error: 'Failed to fetch RSS deals for that keyword.' }, { status: 500 });
    }

    const deals = feed.items.slice(0, 5); // Limit to 5 per search to avoid hitting Gemini Free Tier Rate Limits too fast
    if (deals.length === 0) {
      return NextResponse.json({ message: 'No deals found for that keyword.', added: 0 });
    }

    connection = await getConnection();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let addedCount = 0;

    for (const deal of deals) {
      // 1. Check if raw deal exists
      let rawId;
      try {
        const [result] = await connection.execute(
          `INSERT INTO raw_deals (source_url, title, raw_content, published_at) VALUES (?, ?, ?, ?)`,
          [deal.link, deal.title, deal.content || deal.contentSnippet || '', deal.pubDate || new Date().toISOString()]
        );
        rawId = result.insertId;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          continue; // Deal already exists
        }
        console.error("Raw DB Insert Error:", e);
        continue;
      }

      if (!rawId) continue;

      // 2. Pre-extract image
      const rawContent = deal.content || deal.contentSnippet || '';
      let preExtractedImage = null;
      const imgMatch = rawContent.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        preExtractedImage = imgMatch[1];
      }

      // 3. Extract with Gemini
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
        
        if (textResult.startsWith('```json')) {
          textResult = textResult.substring(7, textResult.length - 3);
        } else if (textResult.startsWith('```')) {
          textResult = textResult.substring(3, textResult.length - 3);
        }
        
        extractedData = JSON.parse(textResult);
      } catch (e) {
        console.error("Gemini Extraction Error for deal:", deal.title, e);
        // Continue loop even if extraction fails
      }

      // 4. Insert into normalized_deals
      if (extractedData) {
        try {
          await connection.execute(
            `INSERT INTO normalized_deals (
                raw_deal_id, title, brand, original_price, discount_price, 
                discount_percentage, url, image_url, confidence_score, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
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

    return NextResponse.json({ success: true, added: addedCount });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Internal server error while searching deals' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
