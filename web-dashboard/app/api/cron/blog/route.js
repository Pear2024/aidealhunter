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

        const dynamicAngles = [
            "Unbelievable hidden 'cheap eats' and budget food hacks exclusively around Hemet, CA.",
            "The ultimate guide to scoring massive markdown clearance deals at Walmart and Target in the IE.",
            "Best budget-friendly motels, cheap stays, and affordable short-term living near Hemet.",
            "Free or practically free family weekend activities and hidden parks in Riverside County.",
            "Hidden thrift stores, flea markets, and vintage bargain hunting in the Inland Empire.",
            "Budget-friendly date night ideas under $20 in and around Hemet.",
            "Secrets for slashing grocery bills using local discount markets (Aldi, Grocery Outlet) in SoCal.",
            "Affordable DIY home improvement hacks using local IE hardware clearance aisles.",
            "Budget pet care: Finding cheap supplies and affordable dog parks near Hemet.",
            "Tech on a budget: Sourcing cheap refurbished electronics and appliances locally.",
            "Beginner's guide to extreme couponing tailored for Inland Empire residents.",
            "Seasonal bargain hunting: What to buy right now in SoCal to save maximum cash.",
            "Furnishing an entire apartment on a strict budget using IE secondhand shops.",
            "Top 5 cheapest taco stands and highly-rated food trucks hidden in Riverside County.",
            "Free community events, street fairs, and seasonal festivals happening near Hemet."
        ];
        
        const selectedAngle = dynamicAngles[Math.floor(Math.random() * dynamicAngles.length)];

        const prompt = `[CRITICAL ROLE ASSUMPTION: You are an elite SEO Copywriter and Master Blogger specializing in highly viral, deeply engaging content tailored strictly for local Californian demographics (Inland Empire, Hemet).]

Task: Write a highly engaging SEO blog post specifically targeting residents of the Inland Empire and Hemet, California. Secretly embed genuine local geography/street references to build absolute local trust.

Context & Tone:
- You write with extreme confidence, charisma, and a "neighborly but brilliant" tone.
- Your style is modern, punchy, and hooks the reader from the very first sentence using "bucket brigades" (e.g., "But wait...", "Listen:").
- Emojis: Use them strategically to break up text.

Content Generation: Your EXCLUSIVE and ONLY topic for this post is: "${selectedAngle}"
Do NOT deviate from this topic. Do NOT write broadly about weather, gas, or inflation unless it specifically serves this exact topic.

Formatting & Technical SEO Rules:
1. LANGUAGE: Strict 100% US English.
2. LENGTH: At least 500 words of pure gold value.
3. STRUCTURE: Pure HTML strictly wrapped in <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. Short paragraphs (1-3 sentences max).
4. NO MARKDOWN: Do NOT wrap your response in markdown blocks. Return pure JSON.
5. OUTPUT FORMAT: Raw JSON string matching this schema:
{"title": "The Catchy Title (Under 60 chars)", "slug": "catchy-title", "content_html": "<p>Your HTML content...</p>", "cover_image_prompt": "Image generation prompt"}`;

        const genResult = await textModel.generateContent(prompt);
        let rawJson = genResult.response.text().trim();
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const blogData = JSON.parse(rawJson);
        const slug = blogData.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        const encodedPrompt = encodeURIComponent(blogData.cover_image_prompt.trim());
        const randomSeed = Math.floor(Math.random() * 100000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&nologo=true&seed=${randomSeed}`;

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
