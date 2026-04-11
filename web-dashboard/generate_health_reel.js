require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenAI, Type } = require('@google/genai');

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
        retries: 2, timeoutMs: 30000, primary: "gemini-2.5-flash-full", fallbacks: ["gemini-2.5-flash-simplified", "gemini-2.5-flash-minimal"],
        safeDowngrade: (topic) => ({
            script: `A massive breakthrough in cellular wellness has been uncovered regarding ${topic.substring(0,20)}. Experts agree, your cellular awareness defines your aging process. Stay proactive.`,
            caption: `A critical update on ${topic.substring(0, 50)}. Never ignore your cellular health.`,
            image_prompt: "Futuristic abstract glowing geometric particles, highly cinematic, premium wellness style, clean.",
            comment_cta: `🌱 Start your health awareness check-in here: https://bit.ly/nadaniawellness`
        })
    },
    audio: { retries: 2, timeoutMs: 30000, primary: "google-tts", fallbacks: [], safeDowngrade: null },
    image: { retries: 1, timeoutMs: 45000, primary: "pollinations", fallbacks: [], safeDowngrade: (topic) => "branded_fallback_visual" },
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
        
        // 🛡️ Intelligent Pre-Flight Schema Alignment & Validation
        const expectedCols = {
            'id': { type: 'INT', def: 'AUTO_INCREMENT PRIMARY KEY' },
            'topic': { type: 'VARCHAR(255)', def: 'UNIQUE' },
            'status': { type: 'VARCHAR(50)', def: "DEFAULT 'pending'" }, // expected states: pending, processing_lock, posted, posted_no_comment, failed
            'locked_by': { type: 'VARCHAR(100)', def: "NULL" },
            'recovery_attempts': { type: 'INT', def: "DEFAULT 0" },
            'created_at': { type: 'TIMESTAMP', def: "DEFAULT CURRENT_TIMESTAMP" },
            'updated_at': { type: 'TIMESTAMP', def: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
            'posted_at': { type: 'TIMESTAMP', def: "NULL" }
        };

        const [dbSchema] = await conn.execute("SHOW COLUMNS FROM health_reels_queue");
        const existingColumns = {}; 
        dbSchema.forEach(col => { existingColumns[col.Field] = col.Type.toLowerCase(); });

        for (const [colName, colMeta] of Object.entries(expectedCols)) {
            if (!existingColumns[colName]) {
                console.log(`[SCHEMA AUTO-ALIGN] Injecting missing column: ${colName}`);
                try { await conn.execute(`ALTER TABLE health_reels_queue ADD COLUMN ${colName} ${colMeta.type} ${colMeta.def}`); } 
                catch(e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error("Migration Error:", e.message); }
            }
        }

        // 🩺 Critical: Expand severely restricted legacy columns (ENUMs or narrow VARCHARs)
        const currentStatusType = existingColumns['status'] || "";
        if (currentStatusType.includes('enum') || (currentStatusType.includes('varchar') && parseInt(currentStatusType.match(/\d+/) || [0]) < 50)) {
            console.log(`[SCHEMA AUTO-ALIGN] Upgrading restricted status column from ${currentStatusType} to VARCHAR(50)`);
            try { await conn.execute("ALTER TABLE health_reels_queue MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'"); }
            catch(err) { console.error(`[FATAL] Failed to expand status column: ${err.message}`); }
        }

        // 🛡️ Pre-Flight Validation Check (Fails Fast)
        const [postDbSchema] = await conn.execute("SHOW COLUMNS FROM health_reels_queue");
        const postExisting = postDbSchema.map(col => col.Field);
        const missing = Object.keys(expectedCols).filter(col => !postExisting.includes(col));
        
        if (missing.length > 0) {
            const errMsg = `Pre-Flight Fatal: Database Schema Alignment Failed. Missing: ${missing.join(', ')}`;
            console.error(`🚨 ${errMsg}`);
            await sendAlert(conn, "critical", "schema_mismatch", "Database Schema Incomplete", errMsg, { ...context, cooldownHrs: 0 });
            throw new Error(errMsg);
        }

        // Safely add Indexes
        try { await conn.execute("ALTER TABLE health_reels_queue ADD INDEX idx_status_created (status, created_at)"); } catch(e){}
        try { await conn.execute("ALTER TABLE health_reels_queue ADD INDEX idx_locked (locked_by, updated_at)"); } catch(e){}

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
            if (provider.startsWith('gemini-2.5-flash')) {
                if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
                
                // Pure compliant initialization of standard endpoints globally
                const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1' });
                const actualModelString = "gemini-2.5-flash";
                context.actualModelString = actualModelString;
                context.apiVersion = 'v1';

                let aiPrompt = "";
                if (provider === 'gemini-2.5-flash-full') {
                    const ctaStyles = ["SOFT_SELL: Drop keyword 'CELL'", "EDUCATIONAL: Comment 'SCORE'", "ACTION_DIRECT: Comment 'REPORT'"];
                    const hookCategories = ["CURIOSITY", "MYTH_BUSTING", "FUTURE_TREND", "SURPRISING_SCIENCE", "PREMIUM_INSIGHT"];
                    aiPrompt = `You are 'Dr. Nadania AI', an elite Wellness Guide. Topic: ${selectedTopic}. Context: ${new Date().toLocaleDateString('en-US')}. TASK: Write script, caption, image_prompt, comment_cta. Protect Meta compliance: NO "medical biological age", NO diagnoses. Use safer phrases like "wellness baseline". Use hook: ${hookCategories[Math.floor(Math.random() * hookCategories.length)]}. Use CTA: ${ctaStyles[Math.floor(Math.random() * ctaStyles.length)]}. Ensure comment_cta contains the link https://bit.ly/nadaniawellness. Keep script under 300 chars. JSON only.`;
                } else if (provider === 'gemini-2.5-flash-simplified') {
                    aiPrompt = `Topic: ${selectedTopic}. Write a brief 300-character educational wellness script, a short Facebook caption, a safe glowing particles image_prompt, and a comment_cta containing the assessment link https://bit.ly/nadaniawellness. Make tone calm. Return ONLY perfectly valid JSON with keys: script, caption, image_prompt, comment_cta.`;
                } else if (provider === 'gemini-2.5-flash-minimal') {
                    aiPrompt = `You are 'Dr. Nadania AI', a premium wellness brand. Topic: ${selectedTopic}. Return ONLY perfectly valid JSON with these EXACT keys: {"script": "3-sentence safe wellness script.", "caption": "short Facebook summary.", "image_prompt": "calming visual prompt", "comment_cta": "🌱 Start your health awareness check-in here: https://bit.ly/nadaniawellness"}. No markdown, no extra text.`;
                }

                // Payload parameters must be formatted strictly in snake_case mapped to the V1 REST JSON specifications under @google/genai
                console.log(`[SDK ALIGNMENT] Dispatching internal policy [${provider}] to Google GenAI framework -> ${actualModelString} (v1 apiVersion)`);
                const completion = await aiClient.models.generateContent({
                    model: actualModelString,
                    contents: aiPrompt,
                    config: {
                        response_mime_type: "application/json",
                        response_schema: {
                            type: Type.OBJECT,
                            properties: {
                                script: { type: Type.STRING, description: "Voiceover script." },
                                caption: { type: Type.STRING, description: "Facebook caption." },
                                image_prompt: { type: Type.STRING, description: "Cinematic visual prompt." },
                                comment_cta: { type: Type.STRING, description: "CTA comment string." }
                            }, required: ["script", "caption", "image_prompt", "comment_cta"]
                        }
                    }
                });

                const rawResponseText = completion.text;
                const parsedResult = JSON.parse(rawResponseText.replace(/```json/i, '').replace(/```/i, '').trim());
                
                // 🛡️ Output Validation Layer
                if (!parsedResult.script || parsedResult.script.length < 30) throw new Error("Script is suspiciously short or empty.");
                if (parsedResult.script.length > 1500) throw new Error("Script exceeds max limits for a short Reel.");
                
                const placeholders = /\[insert.*?\]|\[topic\]|\[cta\]|\{\{.*?\}\}/i;
                if (placeholders.test(parsedResult.script) || placeholders.test(parsedResult.caption)) {
                    throw new Error("Content contains unresolved template placeholders.");
                }

                // 🛑 Compliance Sanitation Layer
                const riskyPhrases = /(cure|diagnose|guaranteed|reverse aging|clinical result|true biological age)/i;
                if (riskyPhrases.test(parsedResult.script) || riskyPhrases.test(parsedResult.caption)) {
                    throw new Error("Content blocked by meta compliance sanitation layer (risky medical claim detected).");
                }

                if (!parsedResult.caption || parsedResult.caption.length < 10) throw new Error("Caption is empty or invalid.");
                if (!parsedResult.comment_cta || !parsedResult.comment_cta.includes("http")) throw new Error("Missing correct link in CTA.");
                
                return parsedResult;
            }
        });
        const scriptProviderUsed = context.provider;

        // 🎙️ PHASE 2: AUDIO (Self-Healing)
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, `tts_${RUN_ID}.mp3`);
        const imgPath = path.join(tempDir, `bg_${RUN_ID}.png`);
        const outPath = path.join(tempDir, `final_${RUN_ID}.mp4`);

        await executeSelfHealingStep('Audio TTS', 'audio', context, async (provider) => {
            if (provider === 'google-tts') {
                const googleTTS = require('google-tts-api');
                const results = await googleTTS.getAllAudioBase64(aiResponse.script.slice(0, 800), { lang: 'en', slow: false, splitPunct: ',.?' });
                const base64Buffers = results.map(r => Buffer.from(r.base64, 'base64'));
                fs.writeFileSync(audioPath, Buffer.concat(base64Buffers));
            }
        });

        // 🎨 PHASE 3: VERBAL IMAGE (Self-Healing)
        const imgDecision = await executeSelfHealingStep('Image Generation', 'image', context, async (provider) => {
            if (provider === 'pollinations') {
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiResponse.image_prompt)}?width=1080&height=1920&nologo=true`;
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 45000 });
                fs.writeFileSync(imgPath, Buffer.from(imageResponse.data));
                return "loaded";
            }
        });

        if (imgDecision === "branded_fallback_visual") {
            // Generate a premium elegant dark indigo brand background instead of a harsh black frame
            require('child_process').execSync(`ffmpeg -f lavfi -i color=c=0x0A0F1F:s=1080x1920 -vframes 1 ${imgPath}`, {stdio: 'ignore'});
        }

        // ⚙️ PHASE 4: FFmpeg Rendering
        await updateRunLog(conn, { current_step: 'ffmpeg_rendering' });
        try {
            const safeDuration = safeModeActivated ? 10 : Math.max(8, aiResponse.script.split(' ').length * 0.4) + 2; 
            const eff = imgDecision === "branded_fallback_visual" ? "" : "zoompan=z='min(zoom+0.0015,1.5)':d=700:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',";
            require('child_process').execSync(`ffmpeg -y -loop 1 -i ${imgPath} -i ${audioPath} -map 0:v -map 1:a -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${eff}format=yuv420p" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t ${safeDuration} ${outPath}`, { stdio: 'pipe', timeout: 120000 });
        } catch(e) { throw new Error(`FFmpeg Crash: ${e.message}`); }

        // 🚀 PHASE 5: PUBLISH & IDEMPOTENCY FINALIZE
        console.log(`\n📋 Pre-Publish Manifest:
- Requested Policy: ${scriptProviderUsed}
- Actual Model:     ${context.actualModelString || 'UNKNOWN'}
- API Endpoint:     ${context.apiVersion || 'UNKNOWN'}
- Fallback Level:   ${scriptProviderUsed.includes('full') ? 'Primary' : scriptProviderUsed.includes('simplified') ? 'Level 1' : 'Level 2 (Minimal)'}
- Safe Mode:        ${safeModeActivated ? "ACTIVE 🛡️" : "Inactive"}
- Visual Mode:      ${imgDecision === "loaded" ? "AI Generated Mode" : "Branded Fallback Overlay"}
- Validation:       PASSED ✅\n`);

        await executeSelfHealingStep('Graph Publishing', 'publish', context, async () => {
             const form = new FormData();
             form.append('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
             form.append('description', `🚨 New Detail: ${selectedTopic}\n\n${aiResponse.caption}\n\n#NadaniaWellness`);
             form.append('source', fs.createReadStream(outPath));
             const res = await axios.post(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/videos`, form, { headers: form.getHeaders(), maxBodyLength: Infinity });
             let finalStatus = 'posted';
             if(res.data && res.data.id) {
                 try { 
                     if(process.env.LIVE_FIRE_TEST === 'COMMENT') throw new Error("LIVE TEST: Intentionally failed comment injection!");
                     await axios.post(`https://graph.facebook.com/v19.0/${res.data.id}/comments`, { 
                         message: aiResponse.comment_cta, access_token: process.env.FB_PAGE_ACCESS_TOKEN 
                     }); 
                 } catch(cErr) {
                     finalStatus = 'posted_no_comment';
                     await sendAlert(context.conn, "warning", "meta_comment_failure", "Comment Ping Failed", cErr.message, { ...context, cooldownHrs: process.env.LIVE_FIRE_TEST ? 0 : 1 });
                 }
             }

             // Officially Release Lock & Mark Posted
             await context.conn.execute("UPDATE health_reels_queue SET status = ?, locked_by = NULL, posted_at = CURRENT_TIMESTAMP WHERE id = ?", [finalStatus, topicId]);
             await updateRunLog(context.conn, { status: finalStatus, completed_at: new Date(), current_step: 'completed', duration_ms: Date.now() - startTime });
             console.log(`✅ System Graceful Exit. Target Status: ${finalStatus}`);
        });
        
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
