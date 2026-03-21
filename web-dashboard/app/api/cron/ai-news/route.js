import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendTelegramAlert } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow enough time for LLM parsing

export async function GET(request) {
    try {
        // 1. Authenticate the Cron Request (Matches cron-job.org structure)
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const secretKey = process.env.CRON_SECRET_KEY;
        
        if (secretKey && providedKey !== secretKey && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Latest Articles from Google News RSS
        const rssUrl = `https://news.google.com/rss/search?q=Artificial+Intelligence+OR+ChatGPT+OR+Generative+AI&hl=en-US&gl=US&ceid=US:en`;
        
        const response = await fetch(rssUrl, { next: { revalidate: 0 } });
        const xmlText = await response.text();
        
        // Very basic XML Regex Parser to avoid adding new NPM dependencies
        const items = [];
        const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
        
        for (let i = 0; i < Math.min(itemMatches.length, 15); i++) {
            const itemXml = itemMatches[i];
            const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
            const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
            const pubDateMatch = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/);
            
            if (titleMatch && linkMatch) {
                // Ignore empty or irrelevant titles
                items.push({
                    title: titleMatch[1],
                    link: linkMatch[1],
                    date: pubDateMatch ? pubDateMatch[1] : new Date().toISOString()
                });
            }
        }

        if (items.length === 0) {
            return NextResponse.json({ error: 'Empty RSS Feed' }, { status: 500 });
        }

        // 3. Format strictly for Gemini 2.5 Flash
        const newsStringList = items.map((itm, idx) => `[${idx+1}] Title: ${itm.title}\nDate: ${itm.date}\nLink: ${itm.link}\n`).join("\n");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `[CRITICAL MISSION]: You are an elite, highly intelligent Personal AI Assistant curated specifically for an entrepreneur living in the modern global economy.

Here are the top 15 breaking global news articles regarding Artificial Intelligence over the last 24 hours:
${newsStringList}

[YOUR TASK]:
1. Read the titles and identify exactly THREE (3) news updates that are the absolute most important for:
   - Increasing Daily Productivity / Automating Workflows.
   - Creating Passive Income or Monetization Opportunities.
   - Groundbreaking AI Tools that make life exponentially easier for everyday people.
2. Ignore purely theoretical research papers, boring corporate acquisitions, or highly technical coding announcements. Focus ONLY on actionable, exciting news!
3. Translate those 3 selected news pieces into friendly, highly-engaging THAI language.
4. Format your final response strictly as a beautifully structured Telegram Message. Use Emojis!

[FORMAT]:
🚨 **สรุปอัปเดต AI ประจำวัน! นวัตกรรมทำเงิน & ทุ่นแรง** 🚨

1️⃣ **[ชื่อเรื่องข่าวภาษาไทยที่น่าสนใจ]**
📝 สรุป: [อธิบายสั้นๆ ว่าเครื่องมือหลักคืออะไร และช่วยย่นเวลาหรือหาเงินได้อย่างไร]
👉 อ่านต่อ / พิกัด: [ลิงก์ของข่าวนั้น (แบบไม่ต้องครอบ backticks)]

2️⃣ **[ชื่อเรื่องข่าวภาษาไทยที่น่าสนใจ]**
📝 สรุป: ...
👉 อ่านต่อ / พิกัด: ...

3️⃣ **[ชื่อเรื่องข่าวภาษาไทยที่น่าสนใจ]**
📝 สรุป: ...
👉 อ่านต่อ / พิกัด: ...

💡 *ทริคประจำวัน:* [หยิบ 1 ไอเดียจาก 3 ข่าวนี้มาสรุปสั้นๆ ว่าแอดมินควรเอาไปประยุกต์ทำอะไรต่อในวันนี้เพื่อให้เกิดประโยชน์สูงสุด!]

**RESPOND DIRECTLY WITH THE RAW THAI TELEGRAM TEXT. DO NOT USE MARKDOWN CODE BLOCKS (\`\`\`).**`;

        // 4. Sythesize and Translate content!
        const genResult = await textModel.generateContent(prompt);
        let finalMessage = genResult.response.text().trim();
        
        // Strip markdown backticks just in case Gemini ignored the rule
        finalMessage = finalMessage.replace(/```/g, '');
        
        // 5. Send directly to Telegram!
        await sendTelegramAlert(finalMessage);

        // 6. Return Success!
        return NextResponse.json({ success: true, message_sent: true, analyzed_articles: items.length });

    } catch (error) {
        console.error("AI News Intelligence Fault:", error);
        await sendTelegramAlert(`🚨 <b>[News Intelligence Fault]</b>\nFailed scanning Daily AI Opportunities!\n\n<code>${error.message}</code>`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
