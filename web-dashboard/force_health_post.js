require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function main() {
    console.log("🔍 Fetching Medical AI News...");
    const url = "https://news.google.com/rss/search?q=Medical+AI+OR+Health+Technology+OR+Cellular+Nutrition&hl=en-US&gl=US&ceid=US:en";
    const res = await fetch(url);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    let db = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 3306,
        ssl: { rejectUnauthorized: false }
    });

    let unread = null;
    for (let i=0; i<Math.min(itemMatches.length, 10); i++) {
        const tMatch = itemMatches[i].match(/<title>([^<]+)<\/title>/);
        const lMatch = itemMatches[i].match(/<link>([^<]+)<\/link>/);
        if (tMatch && lMatch) {
            const title = tMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const link = lMatch[1];
            const hash = crypto.createHash('sha256').update(link).digest('hex');
            const [rows] = await db.execute('SELECT id FROM sent_ai_news WHERE url_hash = ?', [hash]);
            if (rows.length === 0) {
                unread = { title, link, hash };
                break;
            }
        }
    }
    
    if(!unread) {
        console.log("No unread articles found right now.");
        db.end();
        return;
    }

    console.log("✍️ Generating content using Gemini Flash...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a world-class Medical & Tech journalist writing an engaging, highly-educational social media post for an American audience.
    Source Title: ${unread.title}\nSource Link: ${unread.link}
    [CRITICAL GUIDELINES]:
    1. Summarize the core breakthrough in a simple, easy-to-understand way.
    2. TONE: Pure value and educational. Do not sound like a salesman. Show that AI and clinical science are advancing rapidly!
    3. Break up the text with emojis and short paragraphs.
    4. Do NOT mention any products or brands directly.
    5. At the very end of the post, you MUST include this exact CTA Trap verbatim:
       "🩺 Want to know how your body's cells are functioning? Try our clinical-grade Medical AI assessment for free today at: https://nadaniadigitalllc.com/wellness"`;

    const result = await model.generateContent(prompt);
    let content = result.response.text().trim();
    content += `\n\nFull details: ${unread.link}\n#HealthTech #MedicalAI #CellularNutrition #NadaniaWellness`;
    console.log("📝 Generated Text:\n" + content);

    console.log("🎨 Generating DALL-E Image from AIMLAPI...");
    let imageUrl = "https://images.unsplash.com/photo-1579685412975-f86a643194bc?q=80&w=1080&auto=format&fit=crop";
    try {
        const aiImgRes = await fetch("https://api.aimlapi.com/v1/images/generations", {
            method: "POST", headers: { "Authorization": `Bearer ${process.env.AIMLAPI_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "dall-e-3", prompt: `Cinematic, hyper-realistic, high-tech medical photography inspired by this topic: '${unread.title}'. Soft turquoise and emerald lighting, futuristic clinical feel, very pristine and professional.`, n: 1, size: "1024x1024" })
        });
        const imgData = await aiImgRes.json();
        if (imgData?.data?.[0]?.url) imageUrl = imgData.data[0].url;
        console.log("🖼️ DALL-E Image OK:", imageUrl);
    } catch (e) { console.error("DALL-E Error:", e.message); }

    console.log("🌐 Posting Photo to Facebook...");
    try {
        const fbReq = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl, caption: content, access_token: process.env.FB_PAGE_ACCESS_TOKEN })
        });
        console.log("✅ Facebook Posted Successfully!");
    } catch(e) { console.error("FB Error:", e.message); }

    console.log("💾 Saving to Local SEO Database...");
    try {
        const safeTitle = unread.title.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 100);
        const slug = safeTitle.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
        const blogHtml = `<p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
        await db.execute(`INSERT INTO real_blogs (slug, title, expert_summary, content, image_url, category, tags, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Health Tech', 'AI, Wellness, Cellular', 'Dr. Nadania AI', NOW(), NOW())`, [slug, unread.title, "Latest breakthrough in Medical AI and wellness technology.", blogHtml, imageUrl]);
        console.log("✅ Blog DB Entry Created!");
    } catch(e) { console.warn("DB Blog Error:", e.message); }

    await db.execute('INSERT IGNORE INTO sent_ai_news (url_hash, title) VALUES (?, ?)', [unread.hash, unread.title.substring(0, 500)]);
    db.end();
    console.log("🎉 ALL DONE!");
}
main();
