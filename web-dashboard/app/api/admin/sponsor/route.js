import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export const maxDuration = 300;

export async function POST(request) {
  let connection;
  try {
    const session = await auth();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, brand, price, affiliateUrl, imageUrl, category, context } = body;

    if (!title || !affiliateUrl || !imageUrl || !context) {
      return NextResponse.json({ error: 'Missing required injection fields' }, { status: 400 });
    }

    // 1. Instantly use Gemini 2.5 Flash to write a high-converting SEO Blog and extract an HTML body
    const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        temperature: 0.7,
    });

    const prompt = `Write a compelling, long-form SEO blog article reviewing the following sponsored product/service.
    Brand: ${brand}
    Title/Offer: ${title}
    Details: ${context}
    
    INSTRUCTIONS:
    1. Write an engaging, magazine-style review (minimum 4 paragraphs).
    2. Format using heavy HTML tags (do not use Markdown! Use <h2>, <h3>, <p>, <ul>, <li>, <strong>).
    3. Include a call-to-action to click the link.
    4. Provide ONLY the raw HTML string for the body content. Do not include \`\`\`html tags.`;

    const resLLM = await llm.invoke([new HumanMessage(prompt)]);
    let blogHtml = resLLM.content.replace(/\`\`\`(html)?/g, '').trim();

    // 2. Generate a URL-safe Slug
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

    connection = await getConnection();

    // 3. Insert into normalized_deals
    const [dealResult] = await connection.execute(
        `INSERT INTO normalized_deals (
            title, brand, original_price, discount_price, 
            url, status, submitter_id, vote_score, merchandiser_score, image_url, category
        ) VALUES (?, ?, ?, ?, ?, 'approved', 'admin_sponsor', 100, 100, ?, ?)`,
        [title, brand, parseFloat(price) || 0, parseFloat(price) || 0, affiliateUrl, imageUrl, category]
    );

    const dealId = dealResult.insertId;

    // 4. Insert into ai_blog_posts for the specific Deal
    await connection.execute(
        `INSERT INTO ai_blog_posts (deal_id, slug, title, content_html, image_url) VALUES (?, ?, ?, ?, ?)`,
        [dealId, title, title, blogHtml, imageUrl]
    );

    return NextResponse.json({ success: true, dealId, slug });
  } catch (error) {
    console.error('Sponsor Injection Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
