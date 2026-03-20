import { GoogleGenerativeAI } from "@google/generative-ai";

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

        // Pick a random category
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        console.log(`🎲 Selected Category: ${randomCategory.type}`);

        // 3. Generate Content using Gemini
        let generatedText = '';
        try {
             const result = await textModel.generateContent(randomCategory.prompt);
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

        // 4. Attach Random Image & Publish to Facebook
        const aestheticImages = [
            "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200&auto=format&fit=crop"  
        ];
        const randomImage = aestheticImages[Math.floor(Math.random() * aestheticImages.length)];

        // We use /photos endpoint instead of /feed to make it a Native Photo Post
        const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: generatedText,
                url: randomImage
            })
        });
        const fbResult = await fbResponse.json();

        if (fbResult.id) {
            console.log(`🚀 Published Organic Post to Facebook (ID: ${fbResult.id})`);
            return new Response(JSON.stringify({ success: true, category: randomCategory.type, post_id: fbResult.id, text: generatedText }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            console.error("❌ Facebook Post Failed:", fbResult);
            return new Response(JSON.stringify({ error: "FB Post Failed", details: fbResult }), { status: 500 });
        }

    } catch (error) {
        console.error("CRITICAL ERROR IN ENGAGEMENT CRON:", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
