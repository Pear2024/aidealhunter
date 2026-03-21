import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Act as an elite SEO lifestyle and tech blogger living in Hemet, California. Write a highly engaging, brand-new 500-word blog post.
Topic ideas (pick one randomly): 
- How to save money shopping online in Riverside County.
- Top smart home gadgets to beat the Inland Empire summer heat.
- Essential tech gear for your next trip to Big Bear or Joshua Tree.
- California budgeting: Life hacks for Amazon Prime lovers.

Rules:
1. MUST BE IN FULL ENGLISH.
2. Formatting MUST be pure HTML (use <h2>, <p>, <ul>, <li>, <strong> tags). Do NOT wrap the JSON in Markdown backticks.
3. Return ONLY a raw JSON string strictly in this format:
{"title": "The Catchy Title", "slug": "the-catchy-title", "content_html": "<h2>Section</h2>..."}`;

        const genResult = await textModel.generateContent(prompt);
        let rawJson = genResult.response.text().trim();
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const blogData = JSON.parse(rawJson);
        const slug = blogData.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const aestheticBackgrounds = [
            'https://images.unsplash.com/photo-1542435503-956c469947f6', // Minimal desk
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085', // Tech table
            'https://images.unsplash.com/photo-1461151304267-38535e780c79', // Laptop sunset
            'https://images.unsplash.com/photo-1481481600673-c6cb16d4e160', // Note taking
            'https://images.unsplash.com/photo-1512756290469-ec264b7fbf87'  // Abstract tech
        ];
        const randomImg = aestheticBackgrounds[Math.floor(Math.random() * aestheticBackgrounds.length)] + '?auto=format&fit=crop&w=1200&q=80';

        connection = await getConnection();
        
        const [insertResult] = await connection.execute(
            `INSERT INTO ai_blog_posts (slug, title, content_html, image_url, created_at) VALUES (?, ?, ?, ?, NOW())`,
            [slug, blogData.title, blogData.content_html, randomImg]
        );

        return NextResponse.json({ success: true, blog_id: insertResult.insertId, slug: slug });
        
    } catch (error) {
        console.error("Cron Blog Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e) {}
        }
    }
}
