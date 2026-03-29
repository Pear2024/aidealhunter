import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConnection } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Helper to fetch Google News RSS
async function fetchHealthNews() {
    const url = "https://news.google.com/rss/search?q=Medical+AI+OR+Health+Technology+OR+Cellular+Nutrition&hl=en-US&gl=US&ceid=US:en";
    const response = await fetch(url, { cache: 'no-store' });
    const xmlText = await response.text();
    
    const urlRegex = /<item>([\s\S]*?)<\/item>/g;
    const itemMatches = xmlText.match(urlRegex) || [];
    
    let items = [];
    for (let i = 0; i < Math.min(itemMatches.length, 10); i++) {
        const itemXml = itemMatches[i];
        const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
        const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
        if (titleMatch && linkMatch) {
            items.push({
                title: titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
                link: linkMatch[1]
            });
        }
    }
    return items;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const secretKey = process.env.CRON_SECRET_KEY;
        
        if (secretKey && searchParams.get('key') !== secretKey && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const newsItems = await fetchHealthNews();
        let connection = await getConnection();
        
        let unreadItem = null;
        for (const itm of newsItems) {
            const urlHash = crypto.createHash('sha256').update(itm.link).digest('hex');
            const [rows] = await connection.execute('SELECT id FROM sent_ai_news WHERE url_hash = ?', [urlHash]);
            if (rows.length === 0) {
                unreadItem = { ...itm, hash: urlHash };
                break; // Get just one for this 2-hour cycle
            }
        }

        if (!unreadItem) {
            return NextResponse.json({ message: 'No new articles found.' });
        }

        // Generate Post with Gemini Flash
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const systemPrompt = `You are a world-class Medical & Tech journalist writing an engaging, highly-educational social media post for an American audience.
        
        Source Title: ${unreadItem.title}
        Source Link: ${unreadItem.link}

        [CRITICAL GUIDELINES]:
        1. Summarize the core breakthrough in a simple, easy-to-understand way.
        2. TONE: Pure value and educational. Do not sound like a salesman. Show that AI and clinical science are advancing rapidly!
        3. Break up the text with emojis and short paragraphs.
        4. Do NOT mention any products or brands directly.
        5. At the very end of the post, you MUST include this exact CTA Trap verbatim:
           "🩺 Want to know how your body's cells are functioning? Try our clinical-grade Medical AI assessment for free today at: https://nadaniadigitalllc.com/wellness"
        `;

        const result = await model.generateContent(systemPrompt);
        let content = result.response.text().trim();
        content += `\n\nFull details: ${unreadItem.link}\n#HealthTech #MedicalAI #CellularNutrition #NadaniaWellness`;

        // Generate DALL-E Image using AIMLAPI
        let imageUrl = "https://images.unsplash.com/photo-1579685412975-f86a643194bc?q=80&w=1080&auto=format&fit=crop"; // Fallback
        try {
            const aiImgRes = await fetch("https://api.aimlapi.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.AIMLAPI_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: `Cinematic, hyper-realistic, high-tech medical photography inspired by this topic: '${unreadItem.title}'. Soft turquoise and emerald lighting, futuristic clinical feel, very pristine and professional.`,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const imgData = await aiImgRes.json();
            if (imgData && imgData.data && imgData.data[0].url) {
                imageUrl = imgData.data[0].url;
            }
        } catch (imgErr) {
            console.error("DALL-E Generation Warning:", imgErr.message);
        }

        // 1. Post Photo to Facebook Page
        if (process.env.FB_PAGE_ACCESS_TOKEN && process.env.FB_PAGE_ID) {
            try {
                await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: imageUrl,
                        caption: content,
                        access_token: process.env.FB_PAGE_ACCESS_TOKEN
                    })
                });
            } catch (fbErr) { console.error("FB Post Error", fbErr); }
        }

        // 2. Publish to Native Nadania Wellness Blog
        try {
            const safeTitle = unreadItem.title.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 100);
            const slug = safeTitle.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
            // Re-format body into HTML for the blog
            const blogHtml = `<p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
            await connection.execute(`
                INSERT INTO real_blogs (slug, title, expert_summary, content, image_url, category, tags, author, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, 'Health Tech', 'AI, Wellness, Cellular', 'Dr. Nadania AI', NOW(), NOW())
            `, [slug, unreadItem.title, "Latest breakthrough in Medical AI and wellness technology.", blogHtml, imageUrl]);
        } catch (dbLogErr) {
            console.error("Local Blog Insert Error:", dbLogErr.message);
        }

        // Mark as Read
        await connection.execute('INSERT IGNORE INTO sent_ai_news (url_hash, title) VALUES (?, ?)', [unreadItem.hash, unreadItem.title.substring(0, 500)]);

        return NextResponse.json({ 
            success: true, 
            posted_title: unreadItem.title,
            image_url: imageUrl,
            generated_content: content
        });

    } catch (error) {
        console.error("Health Automation Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
