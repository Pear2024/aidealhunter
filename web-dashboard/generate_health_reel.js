require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const ffmpeg = require('fluent-ffmpeg');

async function fetchHealthNews() {
    const topics = [
        "Medical AI", "Cellular Nutrition", "Anti-aging Science", 
        "Longevity Research", "Gut-brain axis", "Precision medicine", 
        "Health Technology breakthroughs", "Epigenetics", "Mitochondrial health",
        "Biohacking", "Metabolic age", "Digital Health Care"
    ];
    const randomQuery = encodeURIComponent(topics[Math.floor(Math.random() * topics.length)]);
    const url = `https://news.google.com/rss/search?q=${randomQuery}&hl=en-US&gl=US&ceid=US:en`;
    
    const response = await fetch(url, { cache: 'no-store' });
    const xmlText = await response.text();
    const urlRegex = /<item>([\s\S]*?)<\/item>/g;
    const itemMatches = xmlText.match(urlRegex) || [];
    let items = [];
    
    // Expand the pool from top 5 to top 20 entirely to prevent looping repetitions
    for (let i = 0; i < Math.min(itemMatches.length, 20); i++) {
        const itemXml = itemMatches[i];
        const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) items.push(titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    }
    return items;
}

async function main() {
    console.log("🎬 Initiating Nadania Medical AI Auto-Reels Engine (3x/Day)...");
    
    try {
        // DB Queue Integration
        const conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            ssl: { rejectUnauthorized: false }
        });

        // Ensure we have pending topics in the queue
        const [pendingRows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
        
        let selectedTopic = "";
        let topicId = null;

        if (pendingRows.length > 0) {
            selectedTopic = pendingRows[0].topic;
            topicId = pendingRows[0].id;
        } else {
            // Queue is empty! Replenish it with fresh news
            console.log("📥 Queue is empty. Fetching fresh news to replenish database...");
            const newsItems = await fetchHealthNews();
            if (newsItems.length === 0) throw new Error("No news found.");
            
            for (const item of newsItems) {
                await conn.execute("INSERT IGNORE INTO health_reels_queue (topic, status) VALUES (?, 'pending')", [item]);
            }
            
            // Re-fetch the newly inserted oldest item
            const [newPendingRows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
            if (newPendingRows.length === 0) throw new Error("Failed to replenish queue.");
            selectedTopic = newPendingRows[0].topic;
            topicId = newPendingRows[0].id;
        }

        console.log(`🎯 Selected Topic from Queue (ID ${topicId}): ${selectedTopic}`);
        await conn.end();

        console.log("✍️ Generating 15s Educational Health Script via Gemini...");
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing from environment secrets!");
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        script: { type: SchemaType.STRING, description: "The spoken voiceover script using the H.I.S.T framework. Must contain a 3-second extremely powerful hook. Max 30 seconds." },
                        caption: { type: SchemaType.STRING, description: "A premium, intelligent Facebook post summarizing the science. No cheap clickbait. 3 short paragraphs. Ends with instructions to comment the keyword." },
                        image_prompt: { type: SchemaType.STRING, description: "A highly safe, cinematic video prompt. Focus on 'Premium Futuristic Clinical' or 'High-End Wellness'. NO raw biology or gore." },
                        comment_cta: { type: SchemaType.STRING, description: "A tailored pinned comment providing the actual assessment link (https://bit.ly/nadaniawellness) acting as the next step." }
                    },
                    required: ["script", "caption", "image_prompt", "comment_cta"]
                }
            }
        });
        
        const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        
        // 1. Dynamic CTA Rotation & Viral Hook Engine
        const ctaStyles = [
            "SOFT_SELL: Empathy driven. Ask them to drop a keyword 'CELL' to get their free cellular wellness snapshot sent via DM.",
            "EDUCATIONAL: Curiosity driven. Ask them to comment 'SCORE' to discover their personalized wellness insights.",
            "ACTION_DIRECT: Value driven. Tell them to comment 'REPORT' immediately to access their health awareness check-in."
        ];
        const selectedCta = ctaStyles[Math.floor(Math.random() * ctaStyles.length)];
        
        const hookCategories = [
            "CURIOSITY: e.g., 'There is a hidden reason why...' (Spark intense intrigue without fearmongering)",
            "MYTH_BUSTING: e.g., 'You've been told [X] is normal aging, but...' (Challenge commonplace beliefs gently)",
            "FUTURE_TREND: e.g., 'The next decade of wellness isn't about a diet, it's about...' (Aspirational and visionary)",
            "SURPRISING_SCIENCE: e.g., 'Researchers just unlocked a new way to look at...' (Fascinating, data-backed realization)",
            "PREMIUM_INSIGHT: e.g., 'Top wellness pioneers are quietly shifting their focus entirely to...' (Exclusive, high-end authority)"
        ];
        const selectedHook = hookCategories[Math.floor(Math.random() * hookCategories.length)];
        
        const aiPrompt = `
You are 'Dr. Nadania AI', an elite Longevity & Wellness Guide. 
Topic: ${selectedTopic}
Date Context: ${todayStr} (If a major holiday, weave it in subtly to remain topical).

TASK:
Write a viral 20-30 second educational Reels script and an engaging social media caption.

BRAND VOICE & COMPLIANCE (CRITICAL FOR META GUIDELINES):
- Tone: Premium, calm, modern, trustworthy. High-end wellness consultant simplified for the public. DO NOT sound salesy or cheap.
- COMPLIANCE: NEVER use terms like "medical biological age", "clinical assessment", "cure", or "actual cellular needs". 
- SAFER LANGUAGE: Use phrases like "wellness baseline", "personalized wellness insights", "cellular wellness snapshot", "wellness report", or "health awareness check-in".
- DO NOT diagnose, guarantee outcomes, or use cheap fear-based manipulation. Focus purely on sharing established cellular wellness and proactive science.

STRUCTURE (The H.I.S.T Model):
1. H (Hook): 0-3 seconds. Start with this specific hook style: [${selectedHook}]. NEVER start with "Hello" or "Today's news". Must stop the scroll immediately.
2. I (Invalidate/Intrigue): Briefly reframe why common knowledge about this topic is slightly outdated.
3. S (Science): Explain the wellness breakthrough simply and elegantly.
4. T (Transition): Seamlessly transition to the CTA without being jarring.

CTA REQUIREMENT & COMMENT:
Instruct the user in the video/caption to COMMENT a specific keyword according to this style: [${selectedCta}].
Do NOT put the link in the caption. Instead, generate 'comment_cta' which will be posted as the first comment containing the link: https://bit.ly/nadaniawellness.
`;
        
        const completion = await model.generateContent(aiPrompt);
        const aiResponse = JSON.parse(completion.response.text());
        
        // Expanded string boundary slightly to support higher quality H.I.S.T pacing
        let cleanScript = aiResponse.script.slice(0, 300);
        console.log(`📜 Script: "${cleanScript}"`);

        // Google Free TTS
        console.log("🗣️ Synthesizing Medical Voice via Google TTS...");
        const googleTTS = require('google-tts-api');
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, 'health_reel_audio.mp3');
        const audioBase64 = await googleTTS.getAudioBase64(cleanScript, { lang: 'en', slow: false, host: 'https://translate.google.com' });
        fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));

        // Background Image Generation 
        console.log("🎨 Generating Cinematic AI Background...");

        const imgPath = path.join(tempDir, 'health_bg.png');
        try {
            // Using Pollinations Image AI (Free) so it won't crash GitHub Action
            const promptEncoded = encodeURIComponent(aiResponse.image_prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=1080&height=1920&nologo=true`;
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            
            fs.writeFileSync(imgPath, Buffer.from(imageResponse.data));
            console.log("🎞️ Background Image Generated Successfully!");
        } catch (imgErr) {
            console.error("\n❌ Image Gen Failed but continuing without background:", imgErr.message);
            // DO NOT THROW. Use a fallback blank image to ensure the FB post goes through!!
            execSync(`ffmpeg -f lavfi -i color=c=black:s=1080x1920 -vframes 1 ${imgPath}`, {stdio: 'ignore'});
        }

        // FFMPEG Assembly (Without Hardcoded Subtitles)
        console.log("⚙️ Assembling Reel via FFmpeg (Static Image + Syncing TTS)...");
        const outPath = path.join(tempDir, 'auto_health_reel.mp4');
        const audioDurationEstimate = Math.max(8, cleanScript.split(' ').length * 0.4); 
        
        const baseVideoFilter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;

        try {
            require('child_process').execSync(`ffmpeg -y -loop 1 -i ${imgPath} -i ${audioPath} -map 0:v -map 1:a -vf "${baseVideoFilter}" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t ${audioDurationEstimate + 2} ${outPath}`, { stdio: 'pipe' });
        } catch(e) {
            console.error("⚠️ FFmpeg Execution Failed:", e.message);
            process.exit(1);
        }

        console.log(`✅ Professional Health Reel rendered flawlessy: ${outPath}`);
        console.log("🚀 Initiating Facebook Graph API Reels Upload...");

        try {
            const pageId = process.env.FB_PAGE_ID;
            const token = process.env.FB_PAGE_ACCESS_TOKEN;
            if (!pageId || !token) throw new Error("Missing FB API keys!");

            // Use the dynamically generated caption natively (avoiding hardcoded spam strings)
            const fullCaption = `🚨 New Insight: ${selectedTopic}\n\n${aiResponse.caption}\n\n#NadaniaWellness #CellularHealth #Biohacking`;
            
            const form = new FormData();
            form.append('access_token', token);
            form.append('description', fullCaption);
            form.append('source', fs.createReadStream(outPath));

            const response = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/videos`, form, {
                headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 60000
            });
            console.log(`🎉 MEGA SUCCESS! Health Reel LIVE! Status:`, response.data);
            
            if (response.data && response.data.id) {
                    try {
                        await axios.post(`https://graph.facebook.com/v19.0/${response.data.id}/comments`, {
                            message: aiResponse.comment_cta || `🌱 Discover your personalized cellular wellness snapshot for FREE. Start your health awareness check-in here: https://bit.ly/nadaniawellness`,
                            access_token: token
                        });
                        console.log(`✅ Assessment CTA Comment Injected Successfully!`);
                        
                        // Mark queue item as officially posted!
                        const finalConn = await mysql.createConnection({
                            host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
                            database: process.env.MYSQL_DATABASE, port: parseInt(process.env.MYSQL_PORT || '3306'), ssl: { rejectUnauthorized: false }
                        });
                        await finalConn.execute("UPDATE health_reels_queue SET status = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = ?", [topicId]);
                        await finalConn.end();
                        console.log(`✅ Queue item ${topicId} marked as 'posted'.`);

                    } catch(err) {
                        console.error('Comment Proxy Error:', err.message);
                    }
            }
        } catch (fbErr) {
            console.error("❌ FB Upload Error", fbErr.message);
        }

    } catch (globalErr) {
        console.error("🚨 FATAL CRASH:", globalErr.stack);
        process.exit(1);
    }
}
main();
