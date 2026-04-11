require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

// ============================================
// 🚨 ALERT SYSTEM & OBSERVABILITY (PRESERVED)
// ============================================
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const RUN_ID = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");

function withTimeout(promise, ms, errorMsg) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timeout: ${errorMsg} exceeded ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function expBackoffDelay(attempt) {
    const base = 5000;
    const factor = Math.pow(3, attempt - 1);
    const delay = (base * factor) + Math.floor(Math.random() * 1000);
    console.log(`⏳ Exponential backoff retry triggered. Waiting ${Math.round(delay/1000)}s...`);
    await new Promise(r => setTimeout(r, delay));
}

async function sendAlert(conn, severity, alertKey, stepName, errorSummary, context = {}) {
    if (conn && alertKey) {
        try {
            await conn.execute(`CREATE TABLE IF NOT EXISTS system_alerts_state (alert_key VARCHAR(100) PRIMARY KEY, last_alert_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, resolved BOOLEAN DEFAULT FALSE)`);
            const [rows] = await conn.execute("SELECT last_alert_at, resolved FROM system_alerts_state WHERE alert_key = ?", [alertKey]);
            if (rows.length > 0 && !rows[0].resolved) {
                const hoursSince = (Date.now() - new Date(rows[0].last_alert_at).getTime()) / 3600000;
                const cooldownHrs = context.cooldownHrs || 4; 
                if (hoursSince < cooldownHrs) return; // Deduplication logic
            }
            await conn.execute("INSERT INTO system_alerts_state (alert_key, last_alert_at, resolved) VALUES (?, CURRENT_TIMESTAMP, FALSE) ON DUPLICATE KEY UPDATE last_alert_at = CURRENT_TIMESTAMP, resolved = FALSE", [alertKey]);
        } catch(e) {}
    }

    if (!DISCORD_WEBHOOK_URL) return;
    let color = 16711680; let icon = "🚨";
    if (severity === "warning") { color = 16776960; icon = "⚠️"; } 
    if (severity === "recovery") { color = 65280; icon = "✅"; }    

    const embed = {
        title: `${icon} System ${severity.toUpperCase()}: ${stepName}`,
        color: color,
        description: `**Summary:** ${errorSummary}`,
        fields: [
            { name: "Environment", value: process.env.NODE_ENV || 'Production', inline: true },
            { name: "Job/Run ID", value: RUN_ID, inline: true },
            { name: "Provider", value: context.provider || "N/A", inline: true },
            { name: "Topic", value: context.topic ? context.topic.substring(0, 50) : "N/A", inline: false },
        ],
        timestamp: new Date().toISOString()
    };

    try { await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] }, { timeout: 10000 }); } catch (e) {}
}

async function resolveAlert(conn, alertKey, message, context = {}) {
    if (!conn) return;
    try {
        const [rows] = await conn.execute("SELECT resolved FROM system_alerts_state WHERE alert_key = ?", [alertKey]);
        if (rows.length > 0 && !rows[0].resolved) {
            await conn.execute("UPDATE system_alerts_state SET resolved = TRUE WHERE alert_key = ?", [alertKey]);
            await sendAlert(conn, "recovery", null, `RECOVERED: ${alertKey}`, message, context);
        }
    } catch(e) {}
}

async function updateRunLog(conn, updates) {
    if(!conn) return;
    try {
        const setQuery = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = Object.values(updates); values.push(RUN_ID);
        await conn.execute(`UPDATE system_run_logs SET ${setQuery} WHERE run_id = ?`, values);
    } catch(e) {}
}

// -----------------------------------------------------
// 🛡️ SELF-HEALING ENGINE & RECOVERY POLICIES
// -----------------------------------------------------
let criticalFailures = 0; // Tracks if we need to enter Safe Mode
let safeModeActivated = false;

const POLICIES = {
    script: {
        retries: 2, timeoutMs: 30000, primary: "gemini-1.5-flash-full", fallbacks: ["gemini-1.5-flash-simplified", "gemini-1.5-flash-minimal"],
        safeDowngrade: (topic) => ({
            script: `A massive breakthrough in cellular wellness has been uncovered regarding ${topic.substring(0,20)}. Experts agree, your cellular awareness defines your aging process. Stay proactive.`,
            caption: `A critical update on ${topic.substring(0, 50)}. Never ignore your cellular health.`,
            image_prompt: "Futuristic abstract glowing geometric particles, highly cinematic, premium wellness style, clean.",
            comment_cta: `🌱 Start your health awareness check-in here: https://bit.ly/nadaniawellness`
        })
    },
    audio: { retries: 2, timeoutMs: 30000, primary: "google-tts", fallbacks: [], safeDowngrade: null },
    image: { retries: 2, timeoutMs: 30000, primary: "pollinations", fallbacks: [], safeDowngrade: (topic) => "static_black_frame" },
    publish: { retries: 3, timeoutMs: 90000, primary: "facebook-graph", fallbacks: [], safeDowngrade: null }
};

async function executeSelfHealingStep(stepName, policyKey, context, executionLogicFn) {
    const policy = POLICIES[policyKey];
    const sequence = [policy.primary, ...(policy.fallbacks || [])];
    
    // Check if Safe Mode was activated by upstream critical failures
    if (safeModeActivated && policy.safeDowngrade) {
        console.warn(`[SAFE MODE ACTIVE] 🛡️ Bypassing ${stepName}. Utilizing Safe Downgrade.`);
        return typeof policy.safeDowngrade === 'function' ? policy.safeDowngrade(context.topic) : policy.safeDowngrade;
    }

    for (const provider of sequence) {
        context.provider = provider;
        console.log(`▶️ Executing [${stepName}] via Provider: ${provider}`);
        
        for (let attempt = 1; attempt <= policy.retries; attempt++) {
            context.retryCount = attempt;
            await updateRunLog(context.conn, { current_step: stepName, retry_count: attempt, provider_used: provider });
            
            try {
                const result = await withTimeout(executionLogicFn(provider, context), policy.timeoutMs, `${stepName}-${provider}`);
                await resolveAlert(context.conn, `${stepName}_failure`, `${stepName} execution successful`, context);
                return result; // Success!
            } catch (error) {
                console.error(`❌ [${stepName}] Attempt ${attempt} failed on ${provider}: ${error.message}`);
                if (attempt === policy.retries) {
                    await sendAlert(context.conn, "warning", `${stepName}_provider_failure`, "Provider Dead", `Exhausted retries on ${provider}. Error: ${error.message}`, context);
                    break; // Move to next fallback provider
                }
                await expBackoffDelay(attempt);
            }
        }
    }

    // All Providers Failed
    criticalFailures++;
    console.error(`🚨 CRITICAL: All providers exhausted for [${stepName}].`);
    
    if (criticalFailures >= 2 && !safeModeActivated) {
        safeModeActivated = true;
        await sendAlert(context.conn, "critical", "safe_mode_trigger", "Safe Mode Engaged", `Multiple critical failures detected. Downgrading pipeline to emergency safe mode to ensure daily publish requirement.`, context);
    }

    if (policy.safeDowngrade) {
        console.warn(`[DOWNGRADE] Falling back to Safe Default for [${stepName}]`);
        return typeof policy.safeDowngrade === 'function' ? policy.safeDowngrade(context.topic) : policy.safeDowngrade;
    }

    throw new Error(`Self-Healing Exhausted: ${stepName} pipeline catastrophically failed with no safe downgrade available.`);
}

// -----------------------------------------------------
// 🚀 AUTOMATIC RECOVERY SCHEDULER
// -----------------------------------------------------
async function triggerRecoveryRun(conn, topicId, errorContext) {
    console.log(`[DISPATCH] Assessing automatic recovery run for Topic ID: ${topicId}`);
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) {
        console.warn("⚠️ Cannot trigger automatic recovery: Missing GITHUB_TOKEN or GITHUB_REPOSITORY.");
        return;
    }

    try {
        const [rows] = await conn.execute("SELECT recovery_attempts FROM health_reels_queue WHERE id = ?", [topicId]);
        if (rows[0] && rows[0].recovery_attempts >= 1) {
            console.warn("⚠️ Max recovery attempts reached for this topic. Canceling trigger loop.");
            return;
        }

        // Release lock & Increment recovery attempts
        await conn.execute("UPDATE health_reels_queue SET status = 'pending', locked_by = NULL, recovery_attempts = recovery_attempts + 1 WHERE id = ?", [topicId]);

        console.log(`📡 Dispatching GitHub Action Recovery Run via API...`);
        await axios.post(
            `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/medical_video_cron.yml/dispatches`,
            { ref: "main", inputs: { is_recovery: "true" } },
            { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
        );
        
        await sendAlert(conn, "recovery", "dispatch_recovery", "Automated Recovery Dispatched", "Scheduled a secondary run to heal the catastrophic failure.", errorContext);
    } catch (apiErr) {
        console.error("Failed to trigger recovery run via GitHub API:", apiErr.message);
    }
}


// ============================================
// 🎬 CORE MAIN WORKFLOW
// ============================================
async function main() {
    console.log(`🎬 Auto-Reels System | Run ID: ${RUN_ID} | Safe-Heal Mode Active`);
    const context = { provider: "System", topic: null, conn: null };
    const startTime = Date.now();
    let topicId = null;

    try {
        // 1. Initial DB Boot & Idempotency Prep
        const conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE, port: parseInt(process.env.MYSQL_PORT || '3306'), ssl: { rejectUnauthorized: false }
        });
        context.conn = conn;

        // Ensure Schema Supports Locking (Idempotency)
        await conn.execute("CREATE TABLE IF NOT EXISTS health_reels_queue (id INT AUTO_INCREMENT PRIMARY KEY, topic VARCHAR(255) UNIQUE, status VARCHAR(50) DEFAULT 'pending', locked_by VARCHAR(100), recovery_attempts INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP, posted_at TIMESTAMP NULL)");
        await conn.execute(`CREATE TABLE IF NOT EXISTS system_run_logs (run_id VARCHAR(50) PRIMARY KEY, started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP NULL, status VARCHAR(20), current_step VARCHAR(50), retry_count INT DEFAULT 0, provider_used VARCHAR(50), selected_topic VARCHAR(255), error_summary TEXT, duration_ms INT)`);
        await conn.execute("INSERT INTO system_run_logs (run_id, status, current_step) VALUES (?, 'running', 'init')", [RUN_ID]);

        // Clean Dead Locks (Recover items stuck in processing > 2 hours)
        await conn.execute("UPDATE health_reels_queue SET status = 'pending', locked_by = NULL WHERE status = 'processing_lock' AND updated_at < NOW() - INTERVAL 2 HOUR");

        // 2. Fetch or Lock Topic (Idempotency Core)
        const [lockResult] = await conn.execute("UPDATE health_reels_queue SET status = 'processing_lock', locked_by = ?, updated_at = NOW() WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1", [RUN_ID]);
        
        if (lockResult.affectedRows === 0) {
            // Queue is truly empty. Fetch fresh via API natively
            const topics = [ "Medical AI", "Cellular Nutrition", "Anti-aging Science", "Precision medicine" ];
            const randomQuery = encodeURIComponent(topics[Math.floor(Math.random() * topics.length)]);
            const response = await fetch(`https://news.google.com/rss/search?q=${randomQuery}&hl=en-US&gl=US&ceid=US:en`, { cache: 'no-store' });
            const xmlText = await response.text();
            for (let match of xmlText.match(/<item>([\s\S]*?)<\/item>/g) || []) {
                const titleMatch = match.match(/<title>([^<]+)<\/title>/);
                if (titleMatch) await conn.execute("INSERT IGNORE INTO health_reels_queue (topic, status) VALUES (?, 'pending')", [titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')]);
            }
            // Retry the lock
            await conn.execute("UPDATE health_reels_queue SET status = 'processing_lock', locked_by = ?, updated_at = NOW() WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1", [RUN_ID]);
        }

        const [rows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE locked_by = ?", [RUN_ID]);
        if (rows.length === 0) throw new Error("Idempotency Lock Failed. Cannot proceed safely.");
        
        selectedTopic = rows[0].topic;
        topicId = rows[0].id;
        context.topic = selectedTopic;
        await updateRunLog(conn, { selected_topic: selectedTopic });
        console.log(`🔒 Acquired Idempotency Lock on Topic ID ${topicId}: ${selectedTopic}`);

        // 🧠 PHASE 1: SCRIPT GEN (Self-Healing)
        const aiResponse = await executeSelfHealingStep('AI Script', 'script', context, async (provider) => {
            if (provider.startsWith('gemini-1.5-flash')) {
                if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
                const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
                    model: "gemini-1.5-flash",
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: SchemaType.OBJECT,
                            properties: {
                                script: { type: SchemaType.STRING, description: "Voiceover script." },
                                caption: { type: SchemaType.STRING, description: "Facebook caption." },
                                image_prompt: { type: SchemaType.STRING, description: "Cinematic visual prompt." },
                                comment_cta: { type: SchemaType.STRING, description: "CTA comment string." }
                            }, required: ["script", "caption", "image_prompt", "comment_cta"]
                        }
                    }
                });

                let aiPrompt = "";
                if (provider === 'gemini-1.5-flash-full') {
                    const ctaStyles = ["SOFT_SELL: Drop keyword 'CELL'", "EDUCATIONAL: Comment 'SCORE'", "ACTION_DIRECT: Comment 'REPORT'"];
                    const hookCategories = ["CURIOSITY", "MYTH_BUSTING", "FUTURE_TREND", "SURPRISING_SCIENCE", "PREMIUM_INSIGHT"];
                    aiPrompt = `You are 'Dr. Nadania AI', an elite Wellness Guide. Topic: ${selectedTopic}. Context: ${new Date().toLocaleDateString('en-US')}. TASK: Write script, caption, image_prompt, comment_cta. Protect Meta compliance: NO "medical biological age", NO diagnoses. Use safer phrases like "wellness baseline". Use hook: ${hookCategories[Math.floor(Math.random() * hookCategories.length)]}. Use CTA: ${ctaStyles[Math.floor(Math.random() * ctaStyles.length)]}. JSON only.`;
                } else if (provider === 'gemini-1.5-flash-simplified') {
                    aiPrompt = `Topic: ${selectedTopic}. Write a brief 20-second educational wellness script, a short Facebook caption, a safe glowing particles image prompt, and a comment containing the assessment link https://bit.ly/nadaniawellness. Make tone calm. Return JSON.`;
                } else if (provider === 'gemini-1.5-flash-minimal') {
                    aiPrompt = `Summarize this topic into 3 sentences: ${selectedTopic}. Format it as JSON containing keys: script, caption, image_prompt, comment_cta. Keep it extremely safe, general wellness advice.`;
                }

                const completion = await model.generateContent(aiPrompt);
                return JSON.parse(completion.response.text());
            }
        });

        // 🎙️ PHASE 2: AUDIO (Self-Healing)
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, `tts_${RUN_ID}.mp3`);
        const imgPath = path.join(tempDir, `bg_${RUN_ID}.png`);
        const outPath = path.join(tempDir, `final_${RUN_ID}.mp4`);

        await executeSelfHealingStep('Audio TTS', 'audio', context, async (provider) => {
            if (provider === 'google-tts') {
                const googleTTS = require('google-tts-api');
                const audioBase64 = await googleTTS.getAudioBase64(aiResponse.script.slice(0, 300), { lang: 'en', slow: false });
                fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));
            }
        });

        // 🎨 PHASE 3: VERBAL IMAGE (Self-Healing)
        const imgDecision = await executeSelfHealingStep('Image Generation', 'image', context, async (provider) => {
            if (provider === 'pollinations') {
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiResponse.image_prompt)}?width=1080&height=1920&nologo=true`;
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                fs.writeFileSync(imgPath, Buffer.from(imageResponse.data));
                return "loaded";
            }
        });

        if (imgDecision === "static_black_frame") {
            require('child_process').execSync(`ffmpeg -f lavfi -i color=c=black:s=1080x1920 -vframes 1 ${imgPath}`, {stdio: 'ignore'});
        }

        // ⚙️ PHASE 4: FFmpeg Rendering
        await updateRunLog(conn, { current_step: 'ffmpeg_rendering' });
        try {
            const safeDuration = safeModeActivated ? 10 : Math.max(8, aiResponse.script.split(' ').length * 0.4) + 2; 
            const eff = imgDecision === "static_black_frame" ? "" : "zoompan=z='min(zoom+0.0015,1.5)':d=700:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',";
            require('child_process').execSync(`ffmpeg -y -loop 1 -i ${imgPath} -i ${audioPath} -map 0:v -map 1:a -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${eff}format=yuv420p" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t ${safeDuration} ${outPath}`, { stdio: 'pipe', timeout: 120000 });
        } catch(e) { throw new Error(`FFmpeg Crash: ${e.message}`); }

        // 🚀 PHASE 5: PUBLISH & IDEMPOTENCY FINALIZE
        await executeSelfHealingStep('Graph Publishing', 'publish', context, async () => {
             const form = new FormData();
             form.append('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
             form.append('description', `🚨 New Detail: ${selectedTopic}\n\n${aiResponse.caption}\n\n#NadaniaWellness`);
             form.append('source', fs.createReadStream(outPath));
             const res = await axios.post(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/videos`, form, { headers: form.getHeaders(), maxBodyLength: Infinity });
             
             if(res.data && res.data.id) {
                 try { await axios.post(`https://graph.facebook.com/v19.0/${res.data.id}/comments`, { message: aiResponse.comment_cta, access_token: process.env.FB_PAGE_ACCESS_TOKEN }); } catch(cErr){}
             }
        });

        // Officially Release Lock & Mark Posted
        await conn.execute("UPDATE health_reels_queue SET status = 'posted', locked_by = NULL, posted_at = CURRENT_TIMESTAMP WHERE id = ?", [topicId]);
        await updateRunLog(conn, { status: 'success', completed_at: new Date(), current_step: 'completed', duration_ms: Date.now() - startTime });
        console.log(`✅ System Graceful Exit.`);
        
        await conn.end();

    } catch (globalErr) {
        if(context.conn) {
            await updateRunLog(context.conn, { status: 'failed', completed_at: new Date(), error_summary: globalErr.message, duration_ms: Date.now() - startTime });
            // Release Lock if crashed so it can be retried / healed
            if (topicId) await triggerRecoveryRun(context.conn, topicId, context);
            await context.conn.end();
        }
        console.error("🚨 FATAL STOP:", globalErr.stack);
        process.exit(1);
    }
}
main();
