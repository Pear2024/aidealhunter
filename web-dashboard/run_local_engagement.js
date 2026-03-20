import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function runEngagement() {
    console.log("🤖 Agent 11 (Engagement): Waking up to generate organic content...");

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

    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    console.log(`🎲 Selected Category: ${randomCategory.type}`);

    let generatedText = '';
    try {
        console.log("✍️ Pinging Gemini API...");
        const result = await textModel.generateContent(randomCategory.prompt);
        generatedText = result.response.text().trim();
        if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
            generatedText = generatedText.substring(1, generatedText.length - 1);
        }
    } catch(e) {
        console.error("Gemini failed, using fallback.", e);
        generatedText = "Quick question for the group: What's the best random thing you've ever bought on Amazon for under $20? 🤔 Drop it in the comments!";
    }

    console.log(`\n🗨️ Generated Post: \n${generatedText}\n`);

    console.log("🚀 Pushing to Facebook...");
    try {
        const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: generatedText })
        });
        const fbResult = await fbResponse.json();

        if (fbResult.id) {
            console.log(`✅ Success! Published Organic Post to Facebook (ID: ${fbResult.id})`);
        } else {
            console.error("❌ Facebook Post Failed:", fbResult);
        }
    } catch(err) {
        console.error("❌ Failed to contact Facebook via local script.", err);
    }
}

runEngagement();
