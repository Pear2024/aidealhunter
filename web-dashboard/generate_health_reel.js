require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const ffmpeg = require('fluent-ffmpeg');

// ============================================
// 🚨 ALERT SYSTEM & OBSERVABILITY (PRODUCTION VARIANTS)
// ============================================
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const RUN_ID = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");

// Helper: Wrap promises with an explicit timeout mechanism
function withTimeout(promise, ms, errorMsg) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timeout: ${errorMsg} exceeded ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// Helper: Exponential Backoff with Jitter (5s, 15s, 45s...)
async function expBackoffDelay(attempt) {
    const base = 5000;
    const factor = Math.pow(3, attempt - 1);
    const delay = (base * factor) + Math.floor(Math.random() * 1000);
    console.log(`⏳ Exponential backoff retry triggered. Waiting ${Math.round(delay/1000)}s...`);
    await new Promise(r => setTimeout(r, delay));
}

// Core Alert Dispatcher with Deduplication & Cooldown logic
async function sendAlert(conn, severity, alertKey, stepName, errorSummary, context = {}) {
    if (conn && alertKey) {
        try {
            await conn.execute(`CREATE TABLE IF NOT EXISTS system_alerts_state (alert_key VARCHAR(100) PRIMARY KEY, last_alert_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, resolved BOOLEAN DEFAULT FALSE)`);
            const [rows] = await conn.execute("SELECT last_alert_at, resolved FROM system_alerts_state WHERE alert_key = ?", [alertKey]);
            if (rows.length > 0 && !rows[0].resolved) {
                const hoursSince = (Date.now() - new Date(rows[0].last_alert_at).getTime()) / 3600000;
                const cooldownHrs = context.cooldownHrs || 4; 
                if (hoursSince < cooldownHrs) {
                    console.log(`🔇 Alert suppressed due to deduplication cooldown: ${alertKey}`);
                    return; 
                }
            }
            await conn.execute("INSERT INTO system_alerts_state (alert_key, last_alert_at, resolved) VALUES (?, CURRENT_TIMESTAMP, FALSE) ON DUPLICATE KEY UPDATE last_alert_at = CURRENT_TIMESTAMP, resolved = FALSE", [alertKey]);
        } catch(e) { console.error("Alert DB State Error:", e.message); }
    }

    if (!DISCORD_WEBHOOK_URL) return;

    let color = 16711680; // Critical (Red)
    let icon = "🚨";
    if (severity === "warning") { color = 16776960; icon = "⚠️"; } // Yellow
    if (severity === "recovery") { color = 65280; icon = "✅"; }    // Green

    const embed = {
        title: `${icon} System ${severity.toUpperCase()}: ${stepName}`,
        color: color,
        description: `**Summary:** ${errorSummary}`,
        fields: [
            { name: "Environment", value: process.env.NODE_ENV || 'Production', inline: true },
            { name: "Job/Run ID", value: RUN_ID, inline: true },
            { name: "Provider", value: context.provider || "N/A", inline: true },
            { name: "Retry Attempt", value: String(context.retryCount || 0), inline: true },
            { name: "Topic", value: context.topic ? context.topic.substring(0, 50) : "N/A", inline: false },
        ],
        timestamp: new Date().toISOString()
    };
    if (context.lastPost) embed.fields.push({ name: "Last Successful Post", value: context.lastPost, inline: false });

    try { await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] }, { timeout: 10000 }); } catch (e) { console.error("Critical: Discord Webhook Failed!"); }
}

async function resolveAlert(conn, alertKey, message, context = {}) {
    if (!conn) return;
    try {
        const [rows] = await conn.execute("SELECT resolved FROM system_alerts_state WHERE alert_key = ?", [alertKey]);
        if (rows.length > 0 && !rows[0].resolved) {
            await conn.execute("UPDATE system_alerts_state SET resolved = TRUE WHERE alert_key = ?", [alertKey]);
            await sendAlert(conn, "recovery", null, `RECOVERED: ${alertKey}`, message, context);
        }
    } catch(e) { console.error("Resolve Alert DB Error:", e.message); }
}

// Update runtime logs state centrally
async function updateRunLog(conn, updates) {
    if(!conn) return;
    try {
        const setQuery = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = Object.values(updates);
        values.push(RUN_ID);
        await conn.execute(`UPDATE system_run_logs SET ${setQuery} WHERE run_id = ?`, values);
    } catch(e) {}
}

async function runDeadManChecks(conn, context) {
    try {
        // 1. Check 24-Hour Silence
        const [lastPostRows] = await conn.execute("SELECT posted_at FROM health_reels_queue WHERE status = 'posted' ORDER BY posted_at DESC LIMIT 1");
        if (lastPostRows.length > 0 && lastPostRows[0].posted_at) {
            const lastPost = new Date(lastPostRows[0].posted_at);
            context.lastPost = lastPost.toISOString();
            if ((Date.now() - lastPost.getTime()) / 3600000 > 24) {
                await sendAlert(conn, "critical", "deadman_silence", "Dead-Man 24h Silence", "No successful posts in over 24 hours.", { ...context, cooldownHrs: 12 });
            } else {
                await resolveAlert(conn, "deadman_silence", "Pipeline successfully posted within the last 24h cycle.", context);
            }
        }

        // 2. Queue Depletion Check
        const [pendingRows] = await conn.execute("SELECT COUNT(*) as c FROM health_reels_queue WHERE status = 'pending'");
        if (pendingRows[0].c === 0) {
            await sendAlert(conn, "warning", "deadman_empty_queue", "Queue Depletion", "Content queue exactly 0. RSS failed to fetch new topics.", { ...context, cooldownHrs: 8 });
        } else {
            await resolveAlert(conn, "deadman_empty_queue", "Queue has been replenished natively.", context);
        }

        // 3. Consecutive Cascade Failures
        const [healthRows] = await conn.execute("SELECT status FROM system_run_logs WHERE run_id != ? ORDER BY started_at DESC LIMIT 2", [RUN_ID]);
        if (healthRows.length === 2 && healthRows[0].status === 'failed' && healthRows[1].status === 'failed') {
            await sendAlert(conn, "critical", "deadman_cascade", "Cascade Failure", "Last 2 consecutive runs failed permanently.", { ...context, cooldownHrs: 4 });
        } else if (healthRows.length > 0 && healthRows[0].status === 'success') {
            await resolveAlert(conn, "deadman_cascade", "Cascade failure broken. Run succeeded.", context);
        }
    } catch (e) {
        context.provider = 'MySQL';
        await sendAlert(conn, "critical", "deadman_db_error", "Dead-Man Check Failure", `Error reading health state: ${e.message}`, context);
    }
}

// ============================================
// 🎬 CORE EXECUTION FLOW
// ============================================
async function main() {
    console.log(`🎬 Initiating Nadania Medical AI Auto-Reels System | Run ID: ${RUN_ID}`);
    const context = { retryCount: 0, lastPost: "Unknown", topic: null, provider: "System" };
    let conn;
    const startTime = Date.now();

    try {
        context.provider = "MySQL";
        conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE, port: parseInt(process.env.MYSQL_PORT || '3306'), ssl: { rejectUnauthorized: false }
        });

        await conn.execute(`CREATE TABLE IF NOT EXISTS system_run_logs ( run_id VARCHAR(50) PRIMARY KEY, started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP NULL, status VARCHAR(20), current_step VARCHAR(50), retry_count INT DEFAULT 0, provider_used VARCHAR(50), selected_topic VARCHAR(255), error_summary TEXT, duration_ms INT )`);
        await conn.execute("INSERT INTO system_run_logs (run_id, status, current_step) VALUES (?, 'running', 'init')", [RUN_ID]);

        await runDeadManChecks(conn, context);
        await updateRunLog(conn, { current_step: 'ingestion' });

        // Retrieve / Fetch Topic
        const [pendingRows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
        let selectedTopic = ""; let topicId = null;

        if (pendingRows.length > 0) {
            selectedTopic = pendingRows[0].topic; topicId = pendingRows[0].id;
        } else {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 15000); // 15s Explicit RSS Timeout

            const topics = [ "Medical AI", "Cellular Nutrition", "Anti-aging Science", "Precision medicine" ];
            const randomQuery = encodeURIComponent(topics[Math.floor(Math.random() * topics.length)]);
            const response = await fetch(`https://news.google.com/rss/search?q=${randomQuery}&hl=en-US&gl=US&ceid=US:en`, { signal: controller.signal, cache: 'no-store' });
            
            const xmlText = await response.text();
            const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
            if (itemMatches.length === 0) throw new Error("No news found.");
            
            for (let i = 0; i < Math.min(itemMatches.length, 20); i++) {
                const titleMatch = itemMatches[i].match(/<title>([^<]+)<\/title>/);
                if (titleMatch) await conn.execute("INSERT IGNORE INTO health_reels_queue (topic, status) VALUES (?, 'pending')", [titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')]);
            }
            
            const [newPendingRows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
            if (newPendingRows.length === 0) throw new Error("Database queue replenishment failed completely.");
            selectedTopic = newPendingRows[0].topic; topicId = newPendingRows[0].id;
        }

        context.topic = selectedTopic;
        await updateRunLog(conn, { selected_topic: selectedTopic });
        console.log(`🎯 Target Topic: ${selectedTopic}`);

        // 🧠 Phase 1: Gemini AI Text Generation
        await updateRunLog(conn, { current_step: 'ai_script_generation' });
        context.provider = "Google Gemini 1.5 Flash";
        let aiResponse = null;
        
        for(let attempt = 1; attempt <= 3; attempt++) {
            context.retryCount = attempt;
            await updateRunLog(conn, { retry_count: attempt });
            try {
                if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY Missing");
                const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
                    model: "gemini-1.5-flash",
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: SchemaType.OBJECT,
                            properties: {
                                script: { type: SchemaType.STRING, description: "H.I.S.T voiceover script. Max 30 seconds." },
                                caption: { type: SchemaType.STRING, description: "Premium Facebook post. 3 paragraphs." },
                                image_prompt: { type: SchemaType.STRING, description: "Cinematic, Safe, High-End Wellness video prompt." },
                                comment_cta: { type: SchemaType.STRING, description: "First pinned comment containing Link." }
                            }, required: ["script", "caption", "image_prompt", "comment_cta"]
                        }
                    }
                });

                const aiPrompt = `You are 'Dr. Nadania AI', an elite Wellness Guide. Topic: ${selectedTopic}. Context: ${new Date().toLocaleDateString('en-US')}. TASK: Write script, caption, image_prompt, comment_cta. Protect Meta compliance: NO "medical biological age", NO diagnoses. Use safer phrases like "wellness baseline". JSON only.`;

                const completion = await withTimeout(model.generateContent(aiPrompt), 30000, "Gemini Request");
                aiResponse = JSON.parse(completion.response.text());
                await resolveAlert(conn, "gemini_api_failure", "Gemini AI generation restored", context);
                break;
            } catch(geminiErr) {
                if (attempt === 3) {
                    await sendAlert(conn, "critical", "gemini_api_failure", "Gemini Exhaustion", geminiErr.message, context);
                    throw geminiErr;
                }
                await expBackoffDelay(attempt);
            }
        }

        // 🎙️ Phase 2: Audio Synthesis
        await updateRunLog(conn, { current_step: 'audio_synthesis' });
        context.provider = "Google TTS";
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, 'health_reel_audio.mp3');
        const imgPath = path.join(tempDir, 'health_bg.png');
        const outPath = path.join(tempDir, 'auto_health_reel.mp4');

        try {
            const googleTTS = require('google-tts-api');
            const audioBase64 = await withTimeout(googleTTS.getAudioBase64(aiResponse.script.slice(0, 300), { lang: 'en', slow: false }), 30000, "Google TTS Request");
            fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));
            await resolveAlert(conn, "tts_api_failure", "TTS Engine operating normally", context);
        } catch(ttsErr) {
            await sendAlert(conn, "critical", "tts_api_failure", "TTS Generation Failed", ttsErr.message, context);
            throw ttsErr;
        }

        // 🎨 Phase 3: Visual Generation
        await updateRunLog(conn, { current_step: 'visual_generation' });
        context.provider = "Pollinations.ai";
        try {
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiResponse.image_prompt)}?width=1080&height=1920&nologo=true`;
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
            fs.writeFileSync(imgPath, Buffer.from(imageResponse.data));
            await resolveAlert(conn, "image_gen_failure", "Image Gen fully restored", context);
        } catch (imgErr) {
            await sendAlert(conn, "warning", "image_gen_failure", "Image Fallback Engaged", `Generating black frame: ${imgErr.message}`, { ...context, cooldownHrs: 2 });
            require('child_process').execSync(`ffmpeg -f lavfi -i color=c=black:s=1080x1920 -vframes 1 ${imgPath}`, {stdio: 'ignore'});
        }

        // ⚙️ Phase 4: FFmpeg Mixing
        await updateRunLog(conn, { current_step: 'ffmpeg_mixing' });
        context.provider = "FFmpeg Local";
        try {
            const durEstimate = Math.max(8, aiResponse.script.split(' ').length * 0.4) + 2; 
            require('child_process').execSync(`ffmpeg -y -loop 1 -i ${imgPath} -i ${audioPath} -map 0:v -map 1:a -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t ${durEstimate} ${outPath}`, { stdio: 'pipe', timeout: 120000 });
            await resolveAlert(conn, "ffmpeg_api_failure", "Video rendered correctly", context);
        } catch(ffmpegErr) {
            await sendAlert(conn, "critical", "ffmpeg_api_failure", "FFmpeg Crash", ffmpegErr.message, context);
            throw ffmpegErr;
        }

        // 🚀 Phase 5: Publishing
        await updateRunLog(conn, { current_step: 'facebook_publishing' });
        context.provider = "Meta Graph API";
        if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_ACCESS_TOKEN) throw new Error("Missing Meta Graph Credentials!");

        const form = new FormData();
        form.append('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
        form.append('description', `🚨 New Insight: ${selectedTopic}\n\n${aiResponse.caption}\n\n#NadaniaWellness #CellularHealth`);
        form.append('source', fs.createReadStream(outPath));

        let fbResponse;
        let pSuccess = false;
        
        for(let attempt = 1; attempt <= 3; attempt++) {
            context.retryCount = attempt;
            await updateRunLog(conn, { retry_count: attempt });
            try {
                fbResponse = await axios.post(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/videos`, form, { headers: form.getHeaders(), maxBodyLength: Infinity, timeout: 90000 });
                pSuccess = true;
                await resolveAlert(conn, "meta_upload_failure", "Meta Graph API Upload working", context);
                break;
            } catch(fbErr) {
                if (attempt === 3) {
                    await sendAlert(conn, "critical", "meta_upload_failure", "Meta Graph Exhaustion", fbErr.message, context);
                    throw fbErr;
                }
                await expBackoffDelay(attempt); // Backoff for Facebook API limits
            }
        }

        if (pSuccess && fbResponse.data && fbResponse.data.id) {
            await updateRunLog(conn, { current_step: 'comment_injection' });
            try {
                await axios.post(`https://graph.facebook.com/v19.0/${fbResponse.data.id}/comments`, {
                    message: aiResponse.comment_cta || `🌱 Discover your personalized wellness snapshot for FREE: https://bit.ly/nadaniawellness`,
                    access_token: process.env.FB_PAGE_ACCESS_TOKEN
                }, { timeout: 30000 });
            } catch(commentErr) {
                await sendAlert(conn, "warning", "meta_comment_failure", "Comment Ping Failed", commentErr.message, { ...context, cooldownHrs: 1 });
            }
            
            await conn.execute("UPDATE health_reels_queue SET status = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = ?", [topicId]);
            await updateRunLog(conn, { status: 'success', completed_at: new Date(), error_summary: null, current_step: 'completed', duration_ms: Date.now() - startTime });
            console.log(`✅ Success! Video Published. ID: ${fbResponse.data.id}`);
        }

        if(conn) await conn.end();

    } catch (globalErr) {
        if(conn) await updateRunLog(conn, { status: 'failed', completed_at: new Date(), error_summary: globalErr.message, duration_ms: Date.now() - startTime });
        console.error("🚨 FATAL STOP:", globalErr.message);
        process.exit(1);
    }
}
main();
