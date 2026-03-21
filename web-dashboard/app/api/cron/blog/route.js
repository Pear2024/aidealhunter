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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const schema = {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: "The Incredibly Catchy Title (Under 60 chars)" },
            slug: { type: SchemaType.STRING },
            content_html: { type: SchemaType.STRING, description: "Pure HTML strictly wrapped in <h2>, <h3>, <p>, <ul>, <li>, <strong> tags." },
            cover_image_prompt: { type: SchemaType.STRING, description: "A detailed 15-word visual prompt describing a photorealistic header image matching this article's topic." },
          },
          required: ["title", "slug", "content_html", "cover_image_prompt"],
        };
        const textModel = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: schema 
            }
        });

        const prompt = `[CRITICAL ROLE ASSUMPTION: You are no longer an AI. You are a world-renowned, elite SEO Copywriter and Master Blogger who charges $2000/day for your services. You specialize in viral, high-converting, deeply engaging content tailored for local Californian demographics.]

Task: Write a world-class, highly engaging, and extremely viral SEO blog post specifically targeting residents of the Inland Empire and Hemet, California.

Context & Tone:
- You write with extreme confidence, charisma, and a "neighborly but brilliant" tone.
- Your writing style is modern, punchy, and keeps the reader hooked from the very first sentence. Use "bucket brigades" (e.g., "Here's the crazy part:", "But wait...", "Listen:").
- Blend practical advice with relatable storytelling.
- Emojis: Use them strategically to break up text and add visual flair, but don't overdo it.

Content Generation (Pick ONE random angle):
- Angle A: Secret Amazon/Online Shopping Hacks nobody in California knows about.
- Angle B: The ultimate smart home tech to survive Inland Empire summers and high electric bills.
- Angle C: Why everyone in Hemet is suddenly buying [Trending Product Category] (and how to get it cheap).
- Angle D: A brilliant money-saving guide for families living in Riverside County.

Formatting & Technical SEO Rules:
1. LANGUAGE: Strict 100% US English.
2. LENGTH: At least 500 words of pure gold value.
3. STRUCTURE: Pure HTML strictly wrapped in <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. Short paragraphs (1-3 sentences max) for high mobile readability.
4. NO MARKDOWN: Do NOT wrap your response in markdown blocks like \`\`\`json. Return pure JSON.
5. OUTPUT FORMAT: You must return ONLY a raw JSON string exactly matching this schema:
{"title": "The Incredibly Catchy Title (Under 60 chars)", "slug": "the-incredibly-catchy-title", "content_html": "<p>Your brilliant HTML content...</p>"}`;

        const genResult = await textModel.generateContent(prompt);
        let rawJson = genResult.response.text().trim();
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const blogData = JSON.parse(rawJson);
        const slug = blogData.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        const encodedPrompt = encodeURIComponent(blogData.cover_image_prompt.trim());
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&nologo=true`;

        connection = await getConnection();
        
        const [insertResult] = await connection.execute(
            `INSERT INTO ai_blog_posts (slug, title, content_html, image_url, created_at) VALUES (?, ?, ?, ?, NOW())`,
            [slug, blogData.title, blogData.content_html, imageUrl]
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
