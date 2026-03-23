import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendTelegramAlert } from '@/lib/telegram';
import { getConnection } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(request) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const secretKey = process.env.CRON_SECRET_KEY;
        
        if (secretKey && providedKey !== secretKey && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Latest Articles from Google News RSS & CBN News
        const rssUrls = [
            `https://news.google.com/rss/search?q=Artificial+Intelligence+OR+ChatGPT+OR+Generative+AI+when:1d&hl=en-US&gl=US&ceid=US:en`,
            `https://news.google.com/rss/search?q=site:cbn.com+when:24h&hl=en-US&gl=US&ceid=US:en`
        ];
        
        let allItems = [];
        for (const url of rssUrls) {
            const response = await fetch(url, { next: { revalidate: 0 } });
            const xmlText = await response.text();
            
            const urlRegex = /<item>([\\s\\S]*?)<\\/item>/g;
            const itemMatches = xmlText.match(urlRegex) || [];
            
            for (let i = 0; i < Math.min(itemMatches.length, 12); i++) {
                const itemXml = itemMatches[i];
                const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
                const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
                const pubDateMatch = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/);
                
                if (titleMatch && linkMatch) {
                    allItems.push({
                        title: titleMatch[1],
                        link: linkMatch[1],
                        date: pubDateMatch ? pubDateMatch[1] : new Date().toISOString()
                    });
                }
            }
        }

        // 2.5 Database Duplication Check
        connection = await getConnection();
        const unreadItems = [];
        
        for (const itm of allItems) {
            try {
                const urlHash = crypto.createHash('sha256').update(itm.link).digest('hex');
                const [rows] = await connection.execute('SELECT id FROM sent_ai_news WHERE url_hash = ?', [urlHash]);
                if (rows.length === 0) {
                    itm.hash = urlHash;
                    unreadItems.push(itm);
                }
            } catch (hashErr) {}
        }

        if (unreadItems.length === 0) {
            return NextResponse.json({ error: 'No new unread articles to broadcast.' }, { status: 200 });
        }

        // 3. Format strictly for Gemini 2.5 Flash
        const finalItemsToRead = unreadItems.slice(0, 16); // Mix of AI + CBN
        const newsStringList = finalItemsToRead.map((itm, idx) => `[${idx+1}] Title: ${itm.title}\nDate: ${itm.date}\nLink: ${itm.link}\n`).join("\n");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `[CRITICAL MISSION]: You are an elite, highly intelligent Personal AI Assistant curated specifically for an entrepreneur living in the modern global economy.

Here are the top unread breaking global news articles regarding Artificial Intelligence & CBN News updates over the last 24 hours:
${newsStringList}

[YOUR TASK]:
1. Read the titles and identify exactly THREE or FOUR (3-4) news updates that are the absolute most important. 
2. Ensure you pick a mix of [Increasing Daily Productivity / Monetization AI Tools] AND [Major World/CBN News updates].
3. Translate those selected news pieces into friendly, highly-engaging THAI language.
4. Format your final response strictly as a beautifully structured Telegram Message. Use Emojis!

[FORMAT]:
🚨 **สรุปอัปเดต AI & สถานการณ์โลก ประจำวัน!** 🚨

1️⃣ **[ชื่อเรื่องข่าวภาษาไทยที่น่าสนใจ]**
📝 สรุป: [อธิบายสั้นๆ ให้ได้ใจความ]
👉 อ่านต่อ / พิกัด: [ลิงก์ของข่าวนั้น (แบบไม่ต้องครอบ backticks)]

2️⃣ **[ชื่อเรื่องข่าวภาษาไทยที่น่าสนใจ]**
📝 สรุป: ...
👉 อ่านต่อ / พิกัด: ...

3️⃣ **[ชื่อเรื่องข่าวภาษาไทยที่น่าสนใจ]**
📝 สรุป: ...
👉 อ่านต่อ / พิกัด: ...

💡 *ทริคประจำวัน:* [หยิบ 1 ไอเดียจากข่าวเหล่านี้มาสรุปสั้นๆ ว่าแอดมินควรเอาไปประยุกต์ใช้อย่างไร!]

**RESPOND DIRECTLY WITH THE RAW THAI TELEGRAM TEXT. DO NOT USE MARKDOWN CODE BLOCKS.**`;

        // 4. Sythesize and Translate content!
        const genResult = await textModel.generateContent(prompt);
        let finalMessage = genResult.response.text().trim();
        finalMessage = finalMessage.replace(/```/g, '');
        
        // 4.5. Intercept and Compress Massive Google News URLs natively in the text!
        const urlExtractRegex = new RegExp("https?:\\/\\/[^\\s]+", "g");
        const extractedUrls = finalMessage.match(urlExtractRegex) || [];
        
        for (const longUrl of extractedUrls) {
             try {
                 const shortRes = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`);
                 const shortData = await shortRes.json();
                 if (shortData.shorturl) {
                     finalMessage = finalMessage.replace(longUrl, shortData.shorturl);
                 }
             } catch (shortenErr) {}
        }
        
        // 5. Send directly to Telegram!
        await sendTelegramAlert(finalMessage);
        
        // 6. Mark these articles as "READ" in the Database so they NEVER repeat!
        for (const itm of finalItemsToRead) {
            try {
                await connection.execute('INSERT IGNORE INTO sent_ai_news (url_hash, title) VALUES (?, ?)', [itm.hash, itm.title.substring(0, 1000)]);
            } catch(dbErr) {}
        }

        return NextResponse.json({ success: true, message_sent: true, analyzed_articles: finalItemsToRead.length });

    } catch (error) {
        console.error("AI News Intelligence Fault:", error);
        await sendTelegramAlert(`🚨 <b>[News Intelligence Fault]</b>\nFailed scanning Daily Updates!\n\n<code>${error.message}</code>`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
