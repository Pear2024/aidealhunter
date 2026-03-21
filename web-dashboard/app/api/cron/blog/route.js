import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(request) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const authHeader = request.headers.get('authorization');
        const secretKey = process.env.CRON_SECRET_KEY;
        
        const isAuthorized = (secretKey && providedKey === secretKey) || (secretKey && authHeader === `Bearer ${secretKey}`);
        if (!isAuthorized && process.env.NODE_ENV !== 'development') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        connection = await getConnection();

        // 1. Fetch Top High-Profit AND Top-Rated (Merchandiser Score) Amazon Deals
        const [deals] = await connection.execute(
            `SELECT * FROM normalized_deals WHERE status = 'approved' AND network = 'Amazon' AND (discount_price > 0 OR original_price > discount_price) ORDER BY profit_score DESC, merchandiser_score DESC LIMIT 20`
        );
        
        if (deals.length === 0) {
            return NextResponse.json({ error: 'No active Amazon deals found to broadcast.' }, { status: 404 });
        }

        // Pick a random high-profit deal from the top 20
        const deal = deals[Math.floor(Math.random() * deals.length)];
        
        const affiliateTag = process.env.AMAZON_AFFILIATE_TAG || 'pear2024-20';
        const dealUrl = deal.url || '';
        const affiliateUrl = dealUrl.includes('?') ? `${dealUrl}&tag=${affiliateTag}` : `${dealUrl}?tag=${affiliateTag}`;

        // 2. Setup Gemini AI Core
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const schema = {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: "The Incredibly Catchy Title (Under 60 chars) focusing on the product/deal" },
            slug: { type: SchemaType.STRING },
            content_html: { type: SchemaType.STRING, description: "Pure HTML strictly wrapped in <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. MUST INCLUDE the CTA button." },
          },
          required: ["title", "slug", "content_html"],
        };
        const textModel = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: schema 
            }
        });

        const prompt = `[CRITICAL ROLE ASSUMPTION: You are an elite SEO Copywriter and Master Blogger specializing in highly viral, deeply engaging product reviews tailored strictly for local Californian demographics (Inland Empire, Hemet).]

Task: Write a highly engaging SEO blog post specifically targeting residents of the Inland Empire and Hemet, California. 
The core objective of this article is to seamlessly REVIEW and RECOMMEND a specific high-profit Amazon product.

PRODUCT DETAILS TO REVIEW:
- Title: ${deal.title}
- Original Price: $${deal.original_price}
- Discounted Sale Price: $${deal.discount_price}
- Product Context: ${deal.description || "Incredible value for money!"}
- Affiliate Link to Buy: ${affiliateUrl}

Context & Tone:
- You write with extreme confidence, charisma, and a "neighborly but brilliant" tone.
- Your style is modern, punchy, and hooks the reader from the very first sentence.
- EXPLAIN why this product is life-changing, practical use cases for someone living in Southern California (e.g., surviving the heat, commuting on the 10 or 215, saving money to eat more tacos), and why the current massive discount makes it a must-buy today!

Formatting & Technical SEO Rules:
1. LANGUAGE: Strict 100% US English.
2. LENGTH: At least 400 words of pure gold value.
3. STRUCTURE: Pure HTML strictly wrapped in <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. Short paragraphs.
4. CALL TO ACTION: You MUST embed an exact HTML Button at the conclusion of the review so they can buy it. Use exactly this HTML for the button:
<a href="${affiliateUrl}" class="btn-primary" style="display:block; text-align:center; padding:15px; margin:20px 0; font-size:1.2rem; font-weight:bold; background:linear-gradient(45deg, #ff3366, #ff9933); color:white; border-radius:10px; text-decoration:none;">🔥 GRAB THIS DEAL ON AMAZON NOW 🔥</a>
5. NO MARKDOWN: Do NOT wrap your response in markdown blocks. Return pure JSON.
6. OUTPUT FORMAT: Raw JSON string matching this schema:
{"title": "The Catchy Title", "slug": "catchy-title", "content_html": "<p>Your HTML content...</p>"}`;

        const genResult = await textModel.generateContent(prompt);
        let rawJson = genResult.response.text().trim();
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const blogData = JSON.parse(rawJson);
        const slug = blogData.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        // 3. Save directly utilizing the REAL Amazon Product Image instead of AI Generation
        const imageUrl = deal.image_url;

        const [insertResult] = await connection.execute(
            `INSERT INTO ai_blog_posts (slug, title, content_html, image_url, created_at) VALUES (?, ?, ?, ?, NOW())`,
            [slug, blogData.title, blogData.content_html, imageUrl]
        );

        return NextResponse.json({ success: true, blog_id: insertResult.insertId, slug: slug, source_deal_id: deal.id });
        
    } catch (error) {
        console.error("Cron Blog Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e) {}
        }
    }
}
