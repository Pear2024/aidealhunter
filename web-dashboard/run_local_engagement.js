import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function runEngagement() {
    console.log("🤖 Agent 12 (Holiday Engagement): Waking up...");

    const categories = [ { type: 'Fallback', prompt: 'Write a basic shopping hack.' } ];

    // MOCK DATE TO TEST CHRISTMAS LOGIC:
    const month = 12; // December
    const date = 24;  // Christmas Eve
    
    let holidayOverride = null;

    if (month === 2 && date <= 14) {
        holidayOverride = {
            type: 'Valentine Specials',
            prompt: `Act as a savvy shopping expert. Write a fun, engaging 2-3 sentence Facebook post asking followers what they are buying their partner for Valentine's Day, or suggesting they treat themselves. Keep it conversational. Use emojis like ❤️🍫.`,
            images: ["https://aidealhunter.vercel.app/holidays/valentine.jpg"]
        };
    } else if (month === 7 && date <= 16) {
        holidayOverride = {
            type: 'Prime Day Hype',
            prompt: `Act as an excited Amazon Deal Hunter. Write a 2-sentence Facebook post hyping up Amazon Prime Day. Ask the audience what item they are hoping goes on sale. Use emojis like 🔥🛒.`,
            images: ["https://aidealhunter.vercel.app/holidays/prime.jpg"]
        };
    } else if (month === 10 && date >= 15) {
         holidayOverride = {
            type: 'Halloween Deals',
            prompt: `Act as a festive community manager. Write a spooky and fun 2-sentence Facebook post asking followers if they are buying their Halloween costumes or candy on Amazon this year. Use emojis like 🎃👻.`,
            images: ["https://aidealhunter.vercel.app/holidays/halloween.jpg"]
         };
    } else if (month === 11 && date >= 15) {
         holidayOverride = {
            type: 'Black Friday Madness',
            prompt: `Act as a hardcore shopping deal hunter. Write an intense 2-sentence Facebook post asking followers if they are ready for the Black Friday / Cyber Monday madness on Amazon, and what their budget is. Use emojis like 💸🏃‍♂️.`,
            images: ["https://aidealhunter.vercel.app/holidays/blackfriday.jpg"]
         };
    } else if (month === 12 && date <= 25) {
         holidayOverride = {
            type: 'Christmas Gift Hunting',
            prompt: `Act as a helpful holiday shopping assistant. Write a warm 2-sentence Facebook post asking the audience if they have finished their Christmas gift shopping yet, or if they wait until the last minute. Use emojis like 🎄🎁.`,
            images: ["https://aidealhunter.vercel.app/holidays/christmas.jpg"]
         };
    }

    let activeCategory;
    let finalImage;

    if (holidayOverride) {
         activeCategory = holidayOverride;
         finalImage = holidayOverride.images[Math.floor(Math.random() * holidayOverride.images.length)];
         console.log(`🎄 Temporal Holiday Triggered: ${activeCategory.type}`);
    } else {
         activeCategory = categories[0];
         finalImage = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200";
    }

    let generatedText = '';
    try {
        console.log("✍️ Pinging Gemini API for Holiday Prompt...");
        const result = await textModel.generateContent(activeCategory.prompt);
        generatedText = result.response.text().trim();
        if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
            generatedText = generatedText.substring(1, generatedText.length - 1);
        }
    } catch(e) {
        console.error("Gemini failed, using fallback.", e);
        if (holidayOverride) {
            generatedText = "Merry Christmas! 🎄 Have you finished all your gift shopping yet, or are you hoping for some last-minute Amazon Prime magic? 🎁";
        } else {
            generatedText = "Quick question for the group: What's the best random thing you've ever bought on Amazon for under $20? 🤔 Drop it in the comments!";
        }
    }

    console.log(`\n🗨️ Generated Post: \n${generatedText}\n`);
    console.log(`🖼️ Final Image URL: \n${finalImage}\n`);

    console.log("🚀 Pushing to Facebook...");
    try {
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
            console.log(`✅ Success! Published Organic Post to Facebook (ID: ${fbResult.id})`);
        } else {
            console.error("❌ Facebook Post Failed:", fbResult);
        }
    } catch(err) {
        console.error("❌ Failed to contact Facebook via local script.", err);
    }
}

runEngagement();
