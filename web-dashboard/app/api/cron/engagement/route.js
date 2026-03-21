import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAgent } from '@/lib/agent_logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function GET(request) {
    try {
        // 1. Basic Security Gate
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        console.log("🤖 Agent 11 (Engagement): Waking up to generate organic content...");
        await logAgent('agent_11', 'Agent 11: Community Engagement', 'Cron Execution Wakeup', 'running', 'Initiating organic audience interaction prompt sequence.');

        // 2. Randomized Content Strategy (1 to 4)
        const categories = [
            {
                type: 'Shopping Hack',
                prompt: `Act as a helpful and savvy shopping expert for an Amazon Deal Hunter Facebook page. Write a highly engaging, 2-3 sentence 'Shopping Hack' or 'Money Saving Tip' for online shopping. Keep it conversational. Do not include URLs. Use 1-2 emojis.`
            },
            {
                type: 'Engagement Q&A',
                prompt: `Act as a community manager for an Amazon Deal Hunter Facebook page. Write a fun, 1-2 sentence question to ask the audience to get them to comment. Examples: "If you had a $500 gift card right now, what's the first thing you'd buy?" or "What's your best Amazon find this year?". Keep it very short. Use 1 emoji.`
            },
            {
                type: 'This or That',
                prompt: `Act as a community manager for an Amazon Deal Hunter Facebook page. Create a quick "This or That" text-only poll for the audience to vote on in the comments. Example: "Morning coffee: A) Drip Machine or B) Espresso Maker? 🤔". Keep it short and engaging. Use emojis.`
            },
            {
                type: 'Shopping Humor',
                prompt: `Write a short, funny 1-2 sentence joke, meme text, or relatable observation about being addicted to online shopping, loving Amazon Prime deliveries, or hiding packages from your spouse. Keep it clean and highly relatable for a Facebook audience. Use 1-2 emojis.`
            }
        ];

        // Temporal Holiday System
        const today = new Date();
        const month = today.getMonth() + 1; // 1-12
        const date = today.getDate();
        let holidayOverride = null;

        if (month === 2 && date <= 14) {
            holidayOverride = {
                type: 'Valentine Specials',
                prompt: `Act as a savvy shopping expert. Write a fun, engaging 2-3 sentence Facebook post asking followers what they are buying their partner for Valentine's Day, or suggesting they treat themselves. Keep it conversational. Use emojis like ❤️🍫.`,
                images: [
                    "https://nadaniadigitalllc.com/holidays/valentine.jpg"
                ]
            };
        } else if (month === 7 && date <= 16) {
            holidayOverride = {
                type: 'Prime Day Hype',
                prompt: `Act as an excited Amazon Deal Hunter. Write a 2-sentence Facebook post hyping up Amazon Prime Day. Ask the audience what item they are hoping goes on sale. Use emojis like 🔥🛒.`,
                images: ["https://nadaniadigitalllc.com/holidays/prime.jpg"]
            };
        } else if (month === 10 && date >= 15) {
             holidayOverride = {
                type: 'Halloween Deals',
                prompt: `Act as a festive community manager. Write a spooky and fun 2-sentence Facebook post asking followers if they are buying their Halloween costumes or candy on Amazon this year. Use emojis like 🎃👻.`,
                images: ["https://nadaniadigitalllc.com/holidays/halloween.jpg"]
             };
        } else if (month === 11 && date >= 15) {
             holidayOverride = {
                type: 'Black Friday Madness',
                prompt: `Act as a hardcore shopping deal hunter. Write an intense 2-sentence Facebook post asking followers if they are ready for the Black Friday / Cyber Monday madness on Amazon, and what their budget is. Use emojis like 💸🏃‍♂️.`,
                images: ["https://nadaniadigitalllc.com/holidays/blackfriday.jpg"]
             };
        } else if (month === 12 && date <= 25) {
             holidayOverride = {
                type: 'Christmas Gift Hunting',
                prompt: `Act as a helpful holiday shopping assistant. Write a warm 2-sentence Facebook post asking the audience if they have finished their Christmas gift shopping yet, or if they wait until the last minute. Use emojis like 🎄🎁.`,
                images: ["https://nadaniadigitalllc.com/holidays/christmas.jpg"]
             };
        }

        let activeCategory;
        let finalImage;

        if (holidayOverride) {
             activeCategory = holidayOverride;
             finalImage = holidayOverride.images[Math.floor(Math.random() * holidayOverride.images.length)];
             console.log(`🎄 Temporal Holiday Triggered: ${activeCategory.type}`);
        } else {
             const aestheticImages = [
                 "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop", 
                 "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop", 
                 "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1200&auto=format&fit=crop", 
                 "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop", 
                 "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200&auto=format&fit=crop"  
             ];
             activeCategory = categories[Math.floor(Math.random() * categories.length)];
             finalImage = aestheticImages[Math.floor(Math.random() * aestheticImages.length)];
             console.log(`🎲 Selected Routine Category: ${activeCategory.type}`);
        }

        // 3. Generate Content using Gemini
        let generatedText = '';
        try {
             const result = await textModel.generateContent(activeCategory.prompt);
             generatedText = result.response.text().trim();
             // Remove wrapping quotes if Gemini adds them
             if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
                 generatedText = generatedText.substring(1, generatedText.length - 1);
             }
        } catch(e) {
             console.error("Gemini failed, using fallback.");
             generatedText = "Quick question for the group: What's the best random thing you've ever bought on Amazon for under $20? 🤔 Drop it in the comments!";
        }

        console.log(`🗨️ Generated Post: \n${generatedText}`);

        // 4. Publish to Facebook using the contextual finalImage
        const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: generatedText,
                url: finalImage
            })
        });
        const fbResult = await fbResponse.json();

        if (fbResult.id) {
            console.log(`🚀 Published Organic Post to Facebook (ID: ${fbResult.id})`);
            await logAgent('agent_8', 'Agent 8: Comment Closer', 'Routine Post Publication', 'success', `Successfully distributed Engagement Content. Facebook ID: ${fbResult.id}`);
            return new Response(JSON.stringify({ success: true, category: activeCategory.type, post_id: fbResult.id, text: generatedText }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            console.error("❌ Facebook Post Failed:", fbResult);
            return new Response(JSON.stringify({ error: "FB Post Failed", details: fbResult }), { status: 500 });
        }

    } catch (error) {
        console.error("CRITICAL ERROR IN ENGAGEMENT CRON:", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
