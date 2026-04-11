require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const ffmpeg = require('fluent-ffmpeg');

// ============================================
// 🚨 ALERT SYSTEM (PRODUCTION-GRADE)
// ============================================
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function sendAlert(stepName, errorSummary, context = {}) {
    if (!DISCORD_WEBHOOK_URL) {
        console.warn(`[WARNING] Webhook URL missing. Alert skipped: ${stepName} - ${errorSummary}`);
        return;
    }
    
    const envName = process.env.NODE_ENV || 'Production';
    const workflow = process.env.GITHUB_WORKFLOW || 'Medical Reel Engine';
    const runId = process.env.GITHUB_RUN_ID || 'Local Run';

    const embed = {
        title: `🚨 System Alert: ${stepName} Failure`,
        color: 16711680, // Red
        description: `**Summary:** ${errorSummary}`,
        fields: [
            { name: "Environment", value: envName, inline: true },
            { name: "Workflow", value: workflow, inline: true },
            { name: "Job/Run ID", value: runId, inline: true },
            { name: "Provider", value: context.provider || "N/A", inline: true },
            { name: "Retry Attempt", value: String(context.retryCount || 0), inline: true },
            { name: "Topic", value: context.topic ? context.topic.substring(0, 50) : "N/A", inline: false },
            { name: "Last Post", value: context.lastPost || "Unknown", inline: false }
        ],
        timestamp: new Date().toISOString()
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
    } catch (e) {
        console.error("Critical: Failed to deliver Discord webhook!", e.message);
    }
}

async function runDeadManChecks(conn, context) {
    try {
        // Ensure tracking table exists
        await conn.execute("CREATE TABLE IF NOT EXISTS system_health_logs (id INT AUTO_INCREMENT PRIMARY KEY, status VARCHAR(20), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

        // 1. 24-Hour Silence Check
        const [lastPostRows] = await conn.execute("SELECT posted_at FROM health_reels_queue WHERE status = 'posted' ORDER BY posted_at DESC LIMIT 1");
        if (lastPostRows.length > 0 && lastPostRows[0].posted_at) {
            const lastPost = new Date(lastPostRows[0].posted_at);
            context.lastPost = lastPost.toISOString();
            const hoursSince = (Date.now() - lastPost.getTime()) / (1000 * 60 * 60);
            if (hoursSince > 24) {
                await sendAlert("Dead-Man: 24h Silence", `No successful posts in the last ${Math.round(hoursSince)} hours. The pipeline is failing silently!`, context);
            }
        }

        // 2. Queue Depletion Check
        const [pendingRows] = await conn.execute("SELECT COUNT(*) as c FROM health_reels_queue WHERE status = 'pending'");
        if (pendingRows[0].c === 0) {
            await sendAlert("Dead-Man: Empty Queue", "The queue is completely empty. RSS ingestion failed or exhausted all topics.", context);
        }

        // 3. Consecutive Failures Check
        const [healthRows] = await conn.execute("SELECT status FROM system_health_logs ORDER BY id DESC LIMIT 2");
        if (healthRows.length === 2 && healthRows[0].status === 'failure' && healthRows[1].status === 'failure') {
            await sendAlert("Dead-Man: Cascade Failure", "The last 2 consecutive runs have failed permanently.", context);
        }
    } catch (e) {
        context.provider = 'MySQL';
        await sendAlert("Dead-Man Checks Failed", `Failed to run health checks: ${e.message}`, context);
    }
}

async function markHealth(conn, status) {
    try { await conn.execute("INSERT INTO system_health_logs (status) VALUES (?)", [status]); } catch (e) {}
}

async function fetchHealthNews(context) {
    try {
        const topics = [ "Medical AI", "Cellular Nutrition", "Anti-aging Science", "Gut-brain axis", "Precision medicine" ];
        const randomQuery = encodeURIComponent(topics[Math.floor(Math.random() * topics.length)]);
        const url = `https://news.google.com/rss/search?q=${randomQuery}&hl=en-US&gl=US&ceid=US:en`;
        
        const response = await fetch(url, { cache: 'no-store' });
        const xmlText = await response.text();
        const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
        let items = [];
        
        for (let i = 0; i < Math.min(itemMatches.length, 20); i++) {
            const itemXml = itemMatches[i];
            const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
            if (titleMatch) items.push(titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
        }
        return items;
    } catch(e) {
        context.provider = "Google News RSS";
        await sendAlert("RSS Fetch Failure", `Could not fetch health news: ${e.message}`, context);
        throw e;
    }
}

// ============================================
// 🎬 CORE EXECUTION FLOW
// ============================================
async function main() {
    console.log("🎬 Initiating Nadania Medical AI Auto-Reels Engine running with Safety Alerts...");
    let context = { retryCount: 0, lastPost: "Unknown", topic: null, provider: "System" };
    let conn;

    try {
        context.provider = "MySQL";
        conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE, port: parseInt(process.env.MYSQL_PORT || '3306'), ssl: { rejectUnauthorized: false }
        });

        await runDeadManChecks(conn, context);

        // Fetch DB Queue
        const [pendingRows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
        let selectedTopic = ""; let topicId = null;

        if (pendingRows.length > 0) {
            selectedTopic = pendingRows[0].topic; topicId = pendingRows[0].id;
        } else {
            const newsItems = await fetchHealthNews(context);
            if (newsItems.length === 0) throw new Error("No news found.");
            for (const item of newsItems) await conn.execute("INSERT IGNORE INTO health_reels_queue (topic, status) VALUES (?, 'pending')", [item]);
            
            const [newPendingRows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
            if (newPendingRows.length === 0) throw new Error("Database queue replenishment failed.");
            selectedTopic = newPendingRows[0].topic; topicId = newPendingRows[0].id;
        }

        context.topic = selectedTopic;
        console.log(`🎯 Selected Topic: ${selectedTopic}`);

        // Phase 1: AI Generation Retry Loop
        let aiResponse = null;
        let generatedContent = false;
        
        for(let attempt = 1; attempt <= 3; attempt++) {
            context.retryCount = attempt;
            context.provider = "Google Gemini 1.5 Flash";
            try {
                if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing!");
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

                const todayStr = new Date().toLocaleDateString('en-US');
                const ctaStyles = ["SOFT_SELL: Empathy driven. Ask them to drop a keyword 'CELL' to get their free cellular wellness snapshot sent via DM.", "EDUCATIONAL: Curiosity driven. Ask them to comment 'SCORE' to discover their personalized wellness insights.", "ACTION_DIRECT: Value driven. Tell them to comment 'REPORT' immediately to access their health awareness check-in."];
                const selectedCta = ctaStyles[Math.floor(Math.random() * ctaStyles.length)];
                const hookCategories = ["CURIOSITY", "MYTH_BUSTING", "FUTURE_TREND", "SURPRISING_SCIENCE", "PREMIUM_INSIGHT"];
                const selectedHook = hookCategories[Math.floor(Math.random() * hookCategories.length)];
                
                const aiPrompt = `You are 'Dr. Nadania AI', an elite Longevity & Wellness Guide. Topic: ${selectedTopic}. Context: ${todayStr}.
                TASK: Write a viral 20-30s Reels script, caption, image_prompt, and comment_cta. Protect Meta compliance: NO "medical biological age", NO diagnoses. 
                Use safer phrases like "wellness baseline". Use hook: ${selectedHook}. Use CTA: ${selectedCta}. JSON only.`;

                const completion = await model.generateContent(aiPrompt);
                aiResponse = JSON.parse(completion.response.text());
                generatedContent = true;
                break; // Break retry loop on success
            } catch(geminiErr) {
                if (attempt === 3) {
                    await sendAlert("Gemini API Failure", `Max retries reached: ${geminiErr.message}`, context);
                    throw geminiErr;
                }
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        // Phase 2: TTS
        let cleanScript = aiResponse.script.slice(0, 300);
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, 'health_reel_audio.mp3');
        const imgPath = path.join(tempDir, 'health_bg.png');
        const outPath = path.join(tempDir, 'auto_health_reel.mp4');

        context.provider = "Google TTS";
        try {
            const googleTTS = require('google-tts-api');
            const audioBase64 = await googleTTS.getAudioBase64(cleanScript, { lang: 'en', slow: false });
            fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));
        } catch(ttsErr) {
            await sendAlert("Audio Gen Failure", ttsErr.message, context);
            throw ttsErr;
        }

        // Phase 3: Image Generation with Fallback Alert
        context.provider = "Pollinations.ai";
        try {
            const promptEncoded = encodeURIComponent(aiResponse.image_prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=1080&height=1920&nologo=true`;
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(imgPath, Buffer.from(imageResponse.data));
        } catch (imgErr) {
            await sendAlert("Image Fallback Exhaustion", `Primary image failed, using black frame. Error: ${imgErr.message}`, context);
            require('child_process').execSync(`ffmpeg -f lavfi -i color=c=black:s=1080x1920 -vframes 1 ${imgPath}`, {stdio: 'ignore'});
        }

        // Phase 4: FFmpeg Render
        context.provider = "FFmpeg Local";
        try {
            const audioDurationEstimate = Math.max(8, cleanScript.split(' ').length * 0.4); 
            require('child_process').execSync(`ffmpeg -y -loop 1 -i ${imgPath} -i ${audioPath} -map 0:v -map 1:a -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t ${audioDurationEstimate + 2} ${outPath}`, { stdio: 'pipe' });
        } catch(ffmpegErr) {
            await sendAlert("FFmpeg Render Failure", ffmpegErr.message, context);
            throw ffmpegErr;
        }

        // Phase 5: Facebook Upload & Comment Injection
        context.provider = "Meta Graph API (Facebook)";
        const pageId = process.env.FB_PAGE_ID;
        const token = process.env.FB_PAGE_ACCESS_TOKEN;
        if (!pageId || !token) throw new Error("Missing FB API keys!");

        const fullCaption = `🚨 New Insight: ${selectedTopic}\n\n${aiResponse.caption}\n\n#NadaniaWellness #CellularHealth`;
        const form = new FormData();
        form.append('access_token', token);
        form.append('description', fullCaption);
        form.append('source', fs.createReadStream(outPath));

        let fbResponse;
        let publishSuccess = false;
        
        for(let attempt = 1; attempt <= 3; attempt++) {
            context.retryCount = attempt;
            try {
                fbResponse = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/videos`, form, { headers: form.getHeaders(), maxBodyLength: Infinity, timeout: 60000 });
                publishSuccess = true;
                break;
            } catch(fbErr) {
                if (attempt === 3) {
                    await sendAlert("FB Upload Failed", `All retries exhausted. Status: ${fbErr.response ? fbErr.response.status : fbErr.message}`, context);
                    throw fbErr;
                }
                await new Promise(r => setTimeout(r, 5000));
            }
        }

        if (publishSuccess && fbResponse.data && fbResponse.data.id) {
            try {
                await axios.post(`https://graph.facebook.com/v19.0/${fbResponse.data.id}/comments`, {
                    message: aiResponse.comment_cta || `🌱 Discover your personalized wellness snapshot for FREE: https://bit.ly/nadaniawellness`,
                    access_token: token
                });
            } catch(commentErr) {
                await sendAlert("Meta Comment Injection Failed", commentErr.message, context);
            }
            
            // Mark Successful
            await conn.execute("UPDATE health_reels_queue SET status = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = ?", [topicId]);
            await markHealth(conn, 'success');
            console.log(`✅ Success! Video Published. Response ID: ${fbResponse.data.id}`);
        }

        await conn.end();

    } catch (globalErr) {
        context.provider = "System Crast";
        console.error("🚨 FATAL CRASH:", globalErr.stack);
        if(conn) await markHealth(conn, 'failure');
        process.exit(1);
    }
}

main();
