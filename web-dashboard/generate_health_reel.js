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
                // Focus on keeping noise low based on severity
                let defaultCooldown = 12; // Base deduplication 12 hours
                if (severity === 'warning') defaultCooldown = 24; // Warning deduplicates for 24 hours
                if (severity === 'critical') defaultCooldown = 4; // Critical ping every 4 hours
                const cooldownHrs = context.cooldownHrs !== undefined ? context.cooldownHrs : defaultCooldown; 
                if (hoursSince < cooldownHrs) {
                    console.log(`[ALERT MUTED] Deduplication active for ${alertKey}. (${Math.round(cooldownHrs - hoursSince)}h remaining)`);
                    return; // Deduplication logic
                }
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

function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("AGENT_EMPTY_RESPONSE");
  }
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AGENT_JSON_INVALID");
  }
  const candidate = rawText.slice(firstBrace, lastBrace + 1)
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
  try {
    return JSON.parse(candidate);
  } catch (e) {
    throw new Error("AGENT_JSON_INVALID");
  }
}

function assertValidAgentResponse(parsed, agentName) {
    if (!parsed || !parsed.data) {
        throw new Error(`${agentName}_SCHEMA_MISMATCH`);
    }
    if (!parsed.agent || !parsed.status) {
        throw new Error(`${agentName}_SCHEMA_MISMATCH`);
    }
    if (parsed.status === "FATAL_FAIL" && parsed.error_code === "FATAL_REJECTED") {
        throw new Error("AGENT_FATAL_REJECTED");
    }
    return parsed;
}

// -----------------------------------------------------
// 🛡️ SELF-HEALING ENGINE & RECOVERY POLICIES
// -----------------------------------------------------
let criticalFailures = 0; // Tracks if we need to enter Safe Mode
let safeModeActivated = false;

const POLICIES = {
    script: {
        retries: 2, timeoutMs: 30000, primary: "gemini-2.5-flash-full", fallbacks: ["gemini-2.5-flash-simplified", "gemini-2.5-flash-minimal"],
        safeDowngrade: (topic) => applySafeTemplateOverride("default", () => {})
    },
    repair: {
        retries: 2, timeoutMs: 30000, primary: "gemini-2.5-flash-full", fallbacks: ["gemini-2.5-flash-simplified", "gemini-2.5-flash-minimal"],
        safeDowngrade: () => ({
            updated_fields: applySafeTemplateOverride("default", () => {}),
            repair_summary: "Safe Mode Fallback Repair Applied"
        })
    },
    reviewer: {
        retries: 2, timeoutMs: 30000, primary: "gemini-2.5-flash-full", fallbacks: ["gemini-2.5-flash-simplified", "gemini-2.5-flash-minimal"],
        safeDowngrade: () => ({
            status: "FAIL",
            failure_type: "REVIEWER_UNAVAILABLE",
            failed_component: "FULL_PAYLOAD",
            repair_instruction: "Re-evaluate entire payload due to reviewer failure",
            scores: { overall: 0 },
            reason: "Reviewer unavailable or invalid JSON"
        })
    },
    audio: { retries: 2, timeoutMs: 30000, primary: "google-tts", fallbacks: [], safeDowngrade: null },
    image: { retries: 2, timeoutMs: 60000, primary: "gemini-imagen", fallbacks: [], safeDowngrade: (topic) => "branded_fallback_visual" },
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
                if (error.message.includes('[FATAL_REJECTED]')) {
                    console.error(`💥 [EDITORIAL SAFETY] Blocked publish due to severe logic violation: ${error.message}`);
                    throw error; // Bypass all retries/fallbacks and send to global crash handler
                }
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

function selectSafeTemplate(sourceType = "default") {
  const templates = {
    TEMPLATE_A: {
      id: "TEMPLATE_A",
      hook: "Cellular health is gaining global attention.",
      script: "Cellular health is an important area of ongoing research. Understanding the body at a cellular level can support informed choices.",
      caption: "Cellular health is an important part of overall wellness.\n\nExplore how research continues to evolve in this space.\n\nComment CELL to learn more 👇",
      comment_cta: "Comment CELL to explore more about cellular wellness 👇",
      image_prompt: "a vibrant colorful bowl of superfoods with berries, seeds, and green leaves, overhead shot, bright natural lighting, clean white background, fresh and healthy feel",
      visual_source: "APPROVED_FALLBACK_TEMPLATE",
      copy_source: "STATIC_APPROVED",
    },
    TEMPLATE_B: {
      id: "TEMPLATE_B",
      hook: "A new focus on cellular wellness is emerging.",
      script: "Companies around the world are exploring cellular wellness. This reflects growing interest in understanding health at a deeper level.",
      caption: "More companies are exploring cellular wellness and research.\n\nStay informed as new developments continue to evolve.\n\nComment CELL to learn more 👇",
      comment_cta: "Comment CELL to stay informed 👇",
      image_prompt: "a modern wellness laboratory with glass test tubes containing colorful plant extracts, soft bokeh background, clean minimalist aesthetic, warm tones",
      visual_source: "APPROVED_FALLBACK_TEMPLATE",
      copy_source: "STATIC_APPROVED",
    },
    TEMPLATE_C: {
      id: "TEMPLATE_C",
      hook: "What does cellular wellness really mean?",
      script: "Cellular wellness is a topic being explored across many research fields. Learning the basics can help you better understand your body.",
      caption: "Cellular wellness is becoming a key topic in health discussions.\n\nStart learning what it means and why it matters.\n\nComment CELL to explore 👇",
      comment_cta: "Comment CELL to explore more 👇",
      image_prompt: "a person in morning sunlight doing yoga stretches on a wooden deck surrounded by nature, golden hour warmth, peaceful and energetic mood, lifestyle photography",
      visual_source: "APPROVED_FALLBACK_TEMPLATE",
      copy_source: "STATIC_APPROVED",
    },
  };
  if (sourceType === "pr" || sourceType === "brand") return templates.TEMPLATE_B;
  if (sourceType === "general") return templates.TEMPLATE_C;
  return templates.TEMPLATE_A;
}

function applySafeTemplateOverride(sourceType, logger = console.log) {
  const template = selectSafeTemplate(sourceType);
  const safePayload = {
    hook: template.hook,
    script: template.script,
    caption: template.caption,
    comment_cta: template.comment_cta,
    image_prompt: template.image_prompt,
    __safe_template_mode: true,
    __safe_template_id: template.id,
    __copy_source: template.copy_source,
    __visual_source: template.visual_source,
  };
  logger(`[SAFE TEMPLATE] Template ID: ${template.id}`);
  logger(`[SAFE TEMPLATE] Copy Source: ${template.copy_source}`);
  logger(`[SAFE TEMPLATE] Visual Source: ${template.visual_source}`);
  return safePayload;
}

function assertSafeTemplateIntegrity(payload) {
  if (!payload.__safe_template_mode) return;
  const requiredFields = ["hook", "script", "caption", "comment_cta", "image_prompt", "__safe_template_id", "__copy_source", "__visual_source"];
  for (const field of requiredFields) {
    if (!payload[field]) throw new Error(`[SAFE_TEMPLATE_INTEGRITY] Missing required field: ${field}`);
  }
  if (payload.__copy_source !== "STATIC_APPROVED") throw new Error("[SAFE_TEMPLATE_INTEGRITY] Copy source is not STATIC_APPROVED");
  if (payload.__visual_source !== "APPROVED_FALLBACK_TEMPLATE") throw new Error("[SAFE_TEMPLATE_INTEGRITY] Visual source is not APPROVED_FALLBACK_TEMPLATE");
}


function previewRaw(text, len = 200) {
  if (!text) return "<empty>";
  return text.slice(0, len).replace(/\s+/g, " ");
}

function validateCreatorPayload(payload) {
  const required = ["hook", "script", "caption", "comment_cta", "image_prompt"];
  if (!payload || typeof payload !== "object") {
    throw new Error("CREATOR_SCHEMA_MISMATCH: payload is not object");
  }
  for (const key of required) {
    if (typeof payload[key] !== "string" || !payload[key].trim()) {
      throw new Error(`CREATOR_${key.toUpperCase()}_MISSING: missing or invalid field ${key}`);
    }
  }
  return payload;
}

async function main() {
    console.log(`🎬 Auto-Reels System | Run ID: ${RUN_ID} | State Machine Mode Active`);
    let currentState = "BOOT";
    let nextState = "";
    let globalErr = null;

    const context = { provider: "System", topic: null, conn: null, actualModelString: "", apiVersion: "" };
    const startTime = Date.now();
    let topicId = null;
    let selectedTopic = null;
    let plannerStrategy = null;
    
    let attempt = 0;
    let aiResponse = null;
    let base64Image = null;
    let imgDecision = null;
    let reviewJson = null;
    let finalStatus = 'posted';

    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `tts_${RUN_ID}.mp3`);
    const imgPath = path.join(tempDir, `bg_${RUN_ID}.png`);
    const outPath = path.join(tempDir, `final_${RUN_ID}.mp4`);

    while (currentState !== "COMPLETE" && currentState !== "FATAL_STOP") {
        try {
            switch (currentState) {
                // -------------------------------------------------------------
                case "BOOT":
                    const conn = await mysql.createConnection({
                        host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
                        database: process.env.MYSQL_DATABASE, port: parseInt(process.env.MYSQL_PORT || '3306'), ssl: { rejectUnauthorized: false }
                    });
                    context.conn = conn;

                    await conn.execute("CREATE TABLE IF NOT EXISTS health_reels_queue (id INT AUTO_INCREMENT PRIMARY KEY, topic VARCHAR(255) UNIQUE, status VARCHAR(50) DEFAULT 'pending', locked_by VARCHAR(100), recovery_attempts INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP, posted_at TIMESTAMP NULL, content_pillar VARCHAR(50), topic_angle VARCHAR(255))");
                    await conn.execute(`CREATE TABLE IF NOT EXISTS system_run_logs (run_id VARCHAR(50) PRIMARY KEY, started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP NULL, status VARCHAR(20), current_step VARCHAR(50), retry_count INT DEFAULT 0, provider_used VARCHAR(50), selected_topic VARCHAR(255), error_summary TEXT, duration_ms INT)`);
                    
                    if (process.env.MAX_POSTS_PER_DAY) {
                         const limit = parseInt(process.env.MAX_POSTS_PER_DAY) || 1;
                         const [todayCount] = await conn.execute("SELECT count(*) as count FROM health_reels_queue WHERE DATE(posted_at) = CURDATE() AND status IN ('posted', 'posted_no_comment', 'published_safe_template_bypass')");
                         if (todayCount[0].count >= limit) {
                             console.log(`[PUBLISH GUARD] Daily limit of ${limit} posts already reached (${todayCount[0].count} actual). Halting pipeline.`);
                             nextState = "COMPLETE";
                             break;
                         }
                    }

                    await conn.execute("INSERT INTO system_run_logs (run_id, status, current_step) VALUES (?, 'running', 'init')", [RUN_ID]);

                    nextState = "LOAD_TOPIC";
                    break;

                // -------------------------------------------------------------
                case "LOAD_TOPIC":
                    await context.conn.execute("UPDATE health_reels_queue SET status = 'pending', locked_by = NULL WHERE status = 'processing_lock' AND updated_at < NOW() - INTERVAL 2 HOUR");

                    let [lockResult] = await context.conn.execute("UPDATE health_reels_queue SET status = 'processing_lock', locked_by = ?, updated_at = NOW() WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1", [RUN_ID]);
                    if (lockResult.affectedRows === 0) {
                        const topics = [ "Medical AI", "Cellular Nutrition", "Anti-aging Science", "Precision medicine" ];
                        const randomQuery = encodeURIComponent(topics[Math.floor(Math.random() * topics.length)]);
                        const response = await fetch(`https://news.google.com/rss/search?q=${randomQuery}&hl=en-US&gl=US&ceid=US:en`, { cache: 'no-store' });
                        const xmlText = await response.text();
                        for (let match of xmlText.match(/<item>([\s\S]*?)<\/item>/g) || []) {
                            const titleMatch = match.match(/<title>([^<]+)<\/title>/);
                            if (titleMatch) await context.conn.execute("INSERT IGNORE INTO health_reels_queue (topic, status) VALUES (?, 'pending')", [titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')]);
                        }
                        await context.conn.execute("UPDATE health_reels_queue SET status = 'processing_lock', locked_by = ?, updated_at = NOW() WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1", [RUN_ID]);
                    }

                    const [rows] = await context.conn.execute("SELECT id, topic FROM health_reels_queue WHERE locked_by = ?", [RUN_ID]);
                    if (rows.length === 0) throw new Error("Idempotency Lock Failed.");
                    
                    selectedTopic = rows[0].topic;
                    topicId = rows[0].id;
                    context.topic = selectedTopic;
                    await updateRunLog(context.conn, { selected_topic: selectedTopic });
                    console.log(`🔒 Acquired Idempotency Lock on Topic ID ${topicId}: ${selectedTopic}`);
                    
                    nextState = "PLAN_STRATEGY";
                    break;

                // -------------------------------------------------------------
                case "PLAN_STRATEGY":
                    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
                    console.log(`[CONTENT PLANNER] Booting Strategic Content Planner Agent...`);
                    const plannerClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    
                    const [recentPosts] = await context.conn.execute("SELECT topic, content_pillar, topic_angle FROM health_reels_queue WHERE status IN ('posted', 'posted_no_comment') ORDER BY posted_at DESC LIMIT 20");
                    const historyList = recentPosts.map(r => `[Pillar: ${r.content_pillar || 'N/A'}] Topic: ${r.topic} -> Angle: ${r.topic_angle || 'N/A'}`).join("\n");
                    
                    let memoryInjection = "No historical learning memory found yet.";
                    const memPath = path.join(process.cwd(), 'historical_winner_patterns.json');
                    if (fs.existsSync(memPath)) {
                        try {
                            const memoryTokens = JSON.parse(fs.readFileSync(memPath, 'utf8')).patterns;
                            memoryInjection = `[BEST HOOK STYLES]: ${memoryTokens.best_hook_styles.join(", ")}
[BEST CTA STYLES]: ${memoryTokens.best_cta_styles.join(", ")}
[PATTERNS TO STRICTLY AVOID]: ${memoryTokens.patterns_to_avoid.join(", ")}`;
                        } catch (e) {
                            console.error("[MEMORY] Failed to load JSON memory:", e.message);
                        }
                    }
                    
                    const plannerPrompt = `[AGENT 1: PLANNER] You are a Chief Content Strategist for a viral health brand.
Your job is to strategically decide the content plan for today's new post to maximize engagement, avoid repetition, and maintain audience rotation.
1. RECENT PAST POSTS (AVOID REPEATING THESE ANGLES):
${historyList || 'No recent posts.'}
2. TODAY'S BASE EXTERNAL TOPIC:
${selectedTopic}
CRITICAL ROTATION POLICY:
- strongly prefer rotating to a completely DIFFERENT pillar compared to the most recent historical post.
- strictly FORBIDDEN to use the same pillar if it was used in both of the last 2 posts.
- If you repeat a pillar, it must be because it is irrefutably the most explosive strategy for today's topic.
3. STRATEGIC OPTIONS TO CHOOSE FROM:
- PILLARS: PAIN, EDUCATION, MYTH, TRANSFORMATION, CTA
- HOOK STYLES: question, warning, hidden truth, emotional pain, shock
- VISUAL STYLES: pain portrait, glowing cells, body energy flow, food threat concept
- CTA KEYWORDS: CELL, SCORE, REPORT
4. AI LEARNING MEMORY (HIGH PRIORITY SUCCESS PATTERNS):
Based on rigorous A/B tracking, you MUST prioritize generating strategies that conform to these proven rules:
${memoryInjection}

Output ONLY valid JSON:
{
  "pillar": "Selected pillar",
  "topic_angle": "How you are adapting today's base topic creatively.",
  "hook_style": "Selected hook style",
  "visual_style": "Selected visual style",
  "cta_keyword": "Selected CTA keyword",
  "reason": "Brief justification for why this mix doesn't overlap with recent posts and fits the daily goal."
}`;
                    const plannerResult = await plannerClient.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: plannerPrompt,
                        config: {
                            response_mime_type: "application/json",
                            response_schema: {
                                type: Type.OBJECT,
                                properties: {
                                    pillar: { type: Type.STRING },
                                    topic_angle: { type: Type.STRING },
                                    hook_style: { type: Type.STRING },
                                    visual_style: { type: Type.STRING },
                                    cta_keyword: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }, required: ["pillar", "topic_angle", "hook_style", "visual_style", "cta_keyword", "reason"]
                            }
                        }
                    });
                    
                    plannerStrategy = JSON.parse(plannerResult.text.replace(/```json/i, '').replace(/```/i, '').trim());
                    console.log(`[CONTENT PLANNER] Decision Locked: Pillar: [${plannerStrategy.pillar}]`);
                    
                    nextState = "GENERATE_TEXT";
                    break;

                // -------------------------------------------------------------
                case "GENERATE_TEXT":
                    aiResponse = await executeSelfHealingStep('AI Script', 'script', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const aiPrompt = `You are AGENT 2: CREATOR.
Create a short Facebook Reel content payload.

STRATEGIC DIRECTIVES:
- Content Pillar: ${plannerStrategy.pillar}
- Core Topic Angle: ${plannerStrategy.topic_angle} (Drawn from: ${selectedTopic})

Requirements:
- hook: max 8 words, STOP-THE-SCROLL compelling
- script: max 120 characters STRICT (this is critical for 30-second video cap)
- caption: short, punchy, include 3-5 hashtags
- comment_cta: direct engagement CTA (e.g., "Comment CELL if you relate")
- image_prompt: IMPORTANT: Create a UNIQUE, DIVERSE visual concept. Do NOT default to "glowing cells" or "dark background". Instead, choose from styles like:
  * Lifestyle photography (person eating healthy, exercising, morning routine)
  * Nature macro (fruits, vegetables, seeds, superfoods close-up)
  * Medical/lab aesthetic (lab equipment, test tubes, modern clinic)
  * Abstract art (geometric patterns, flowing gradients, light prisms)
  * Infographic style (clean icons, data visualization feel)
  * Kitchen/food scene (colorful ingredients, supplement bottles, smoothies)
  * Human body illustration (organs, muscles, anatomy, NOT microscopic cells)
  * Environmental (ocean, forest, sunrise, fresh air atmosphere)
  Match the visual to the TOPIC, not always to "cells". Keep it single subject, clean composition, no text.

CRITICAL OUTPUT RULE:
Return ONLY one valid JSON object.
Do not add explanations.
Do not add markdown.
Do not add code fences.
Do not add any text before or after the JSON.
If you cannot comply, return:
{"hook":"ERROR","script":"ERROR","caption":"ERROR","comment_cta":"ERROR","image_prompt":"ERROR"}`;

                        let completion;
                        try {
                            completion = await aiClient.models.generateContent({
                                model: "gemini-2.5-flash",
                                contents: aiPrompt,
                                config: {
                                    response_mime_type: "application/json",
                                    response_schema: {
                                        type: Type.OBJECT,
                                        properties: {
                                            hook: { type: Type.STRING },
                                            script: { type: Type.STRING },
                                            caption: { type: Type.STRING },
                                            image_prompt: { type: Type.STRING },
                                            comment_cta: { type: Type.STRING }
                                        }, required: ["hook", "script", "caption", "image_prompt", "comment_cta"]
                                    }
                                }
                            });
                            const parsed = extractJsonObject(completion.text);
                            const payload = parsed.data || parsed;
                            validateCreatorPayload(payload);
                            return payload;
                        } catch (err) {
                            if (completion && completion.text) {
                                console.error(`[CREATOR DEBUG] Raw preview: ${previewRaw(completion.text)}`);
                            }
                            throw err;
                        }
                    });
                    console.log(`[AGENT 2: CREATOR] Generated Hook: "${aiResponse.hook}"`);
                    
                    nextState = "GENERATE_AUDIO";
                    break;

                // -------------------------------------------------------------
                case "GENERATE_AUDIO":
                    await executeSelfHealingStep('Audio TTS', 'audio', context, async (provider) => {
                        if (provider === 'google-tts') {
                            const googleTTS = require('google-tts-api');
                            const results = await googleTTS.getAllAudioBase64(aiResponse.script.slice(0, 400), { lang: 'en', slow: false, splitPunct: ',.?' });
                            const base64Buffers = results.map(r => Buffer.from(r.base64, 'base64'));
                            fs.writeFileSync(audioPath, Buffer.concat(base64Buffers));
                        }
                    });
                    
                    if (base64Image) { nextState = "REVIEW_PAYLOAD"; } else { nextState = "GENERATE_IMAGE"; }
                    break;

                // -------------------------------------------------------------
                case "GENERATE_IMAGE":
                    imgDecision = await executeSelfHealingStep('Image Generation', 'image', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const response = await aiClient.models.generateImages({
                            model: process.env.GEMINI_IMAGEN_MODEL || 'imagen-4.0-generate-001',
                            prompt: `Premium vertical health ad design: ${aiResponse.image_prompt}. STRICTLY: Emotional impact, single prominent subject, visually striking, no text overlays, no watermarks.`,
                            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' }
                        });
                        if (!response.generatedImages || response.generatedImages.length === 0) throw new Error("Empty image output.");
                        base64Image = response.generatedImages[0].image.imageBytes;
                        fs.writeFileSync(imgPath, Buffer.from(base64Image, 'base64'));
                        return "loaded";
                    });
                    
                    nextState = "REVIEW_PAYLOAD";
                    break;

                // -------------------------------------------------------------
                case "REVIEW_PAYLOAD":
                    console.log(`[SMART RETRY] Holistic review payload...`);
                    let rawReviewJson = await executeSelfHealingStep('Reviewer Agent', 'reviewer', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const reviewerPrompt = `You are AGENT 3: REVIEWER.
You review the generated Reel payload against planner strategy, source topic, editorial safety, and visual clarity.
STRATEGY:
Pillar: ${plannerStrategy.pillar}
Topic: ${selectedTopic}
CREATED:
Hook: ${aiResponse.hook}
Script: ${aiResponse.script}
Caption: ${aiResponse.caption}

Critical rule:
If the hook/caption/script makes stronger health claims than the source explicitly supports, return:
- status: "FAIL"
- failure_type: "CLAIM_OVERREACH"
- failed_component: "SCRIPT"

If the tone does not match the source type (for example a PR/news item is turned into fear-based medical alarm), return:
- status: "FAIL"
- failure_type: "SOURCE_TONE_MISMATCH"
- failed_component: "SCRIPT"

Output schema:
{
  "agent": "REVIEWER",
  "status": "PASS", // or "RETRYABLE_FAIL" or "FATAL_FAIL"
  "error_code": "NONE",
  "retryable": false,
  "message": "evaluation complete",
  "data": {
    "status": "PASS", // or "FAIL"
    "failure_type": "CLAIM_OVERREACH, SOURCE_TONE_MISMATCH, HOOK_TOO_WEAK, VISUAL_NO_SUBJECT, VISUAL_DISTORTION, NONE",
    "failed_component": "SCRIPT, HOOK, IMAGE, FULL_PAYLOAD, NONE",
    "repair_instruction": "String",
    "scores": {
        "overall": 80
    },
    "reason": "String"
  }
}

CRITICAL OUTPUT RULE:
- You MUST return ONLY valid JSON
- NO explanation
- NO text outside JSON
- If you fail -> your output is rejected`;
                        const completion = await aiClient.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: [ { text: reviewerPrompt }, { inlineData: { data: base64Image, mimeType: "image/jpeg" } } ],
                            config: {
                                response_mime_type: "application/json",
                                response_schema: {
                                   type: Type.OBJECT,
                                   properties: {
                                        agent: { type: Type.STRING },
                                        status: { type: Type.STRING, enum: ["PASS", "RETRYABLE_FAIL", "FATAL_FAIL"] },
                                        error_code: { type: Type.STRING },
                                        retryable: { type: Type.BOOLEAN },
                                        message: { type: Type.STRING },
                                        data: {
                                            type: Type.OBJECT,
                                            properties: {
                                                status: { type: Type.STRING },
                                                failure_type: { type: Type.STRING },
                                                failed_component: { type: Type.STRING },
                                                repair_instruction: { type: Type.STRING },
                                                scores: { type: Type.OBJECT, properties: { overall: { type: Type.INTEGER } } },
                                                reason: { type: Type.STRING }
                                            }
                                        },
                                        meta: { type: Type.OBJECT }
                                   }, required: ["agent", "status", "data"]
                                }
                            }
                        });
                        const parsed = extractJsonObject(completion.text);
                        assertValidAgentResponse(parsed, "REVIEWER");
                        if (!parsed.data) throw new Error("REVIEWER_SCHEMA_MISMATCH");
                        return parsed.data;
                    });
                    reviewJson = rawReviewJson;

                    console.log(`[AGENT 3: REVIEWER] Action: ${reviewJson.status} | Failure Type: ${reviewJson.failure_type || 'NONE'} | Component: ${reviewJson.failed_component || 'NONE'} | Reason: ${reviewJson.reason}`);

                    if (context.conn) {
                        await context.conn.execute(
                            "INSERT INTO system_run_logs (run_id, topic_id, retry_sequence, failure_type, failed_component, attempt_status, reviewer_overall_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                            [RUN_ID, topicId, attempt, reviewJson?.failure_type || 'NONE', reviewJson?.failed_component || 'NONE', reviewJson?.status || 'FAIL', reviewJson?.scores?.overall || 0]
                        ).catch(e => {}); 
                    }

                    if (reviewJson?.status === "PASS") {
                        console.log(`[AGENT 3: REVIEWER] ✅ PASS - Payload verified high-quality.`);
                        nextState = "COMPOSE_VIDEO";
                    } else {
                        if (attempt >= 2 || reviewJson?.failure_type === "FATAL_REJECTED") {
                            const topicL = selectedTopic.toLowerCase();
                            const isResearch = topicL.includes("research") || topicL.includes("frontiers") || topicL.includes("study") || topicL.includes("clinical") || topicL.includes("science") || topicL.includes("disease");
                            
                            if (isResearch && ["CLAIM_OVERREACH", "SOURCE_TONE_MISMATCH"].includes(reviewJson?.failure_type)) {
                                console.warn(`[EDITORIAL SAFETY] High-risk topic failed editorial review: ${reviewJson?.failure_type}. Skipping topic.`);
                                finalStatus = "skipped_editorial_failure";
                                nextState = "SKIP_TOPIC";
                            } else {
                                console.warn(`[FATAL ERROR] Smart Retry exhausted. Marking topic as skipped high risk.`);
                                finalStatus = "skipped_high_risk_topic";
                                nextState = "SKIP_TOPIC";
                            }
                            break; 
                        }
                        attempt++;
                        console.log(`[SMART RETRY] Triggered | Failure Type: ${reviewJson?.failure_type} | Component: ${reviewJson?.failed_component} | Attempt: ${attempt}`);
                        
                        
                        const fType = reviewJson?.failure_type || "NONE";
                        if (fType === "REVIEWER_UNAVAILABLE" || fType === "REVIEWER_JSON_INVALID" || fType === "REVIEWER_SCHEMA_MISMATCH") {
                            const isSafeTemplate = aiResponse.__safe_template_mode === true;
                            
                            let policy = "STOP";
                            const topicL = selectedTopic.toLowerCase();
                            const isResearch = topicL.includes("research") || topicL.includes("frontiers") || topicL.includes("study") || topicL.includes("clinical") || topicL.includes("science") || topicL.includes("disease");
                            const isBrandPr = topicL.includes("nestlé") || topicL.includes("brand") || topicL.includes("product") || topicL.includes("launch") || topicL.includes("partnership") || topicL.includes("company") || topicL.includes("supplement");

                            if (isSafeTemplate) {
                                policy = "SAFE_TEMPLATE_ONLY";
                            } else if (isResearch) {
                                policy = "STOP";
                            } else if (isBrandPr) {
                                policy = "MANUAL";
                            } else {
                                policy = "STOP"; // Default fallback for AI generated health claims
                            }

                            if (policy === "SAFE_TEMPLATE_ONLY") {
                                console.log(`[REVIEW POLICY] REVIEWER_UNAVAILABLE -> SAFE_TEMPLATE_ONLY`);
                                console.log(`[REVIEW POLICY] Reason: Using approved non-claim template with zero AI-generated health interpretation`);
                                
                                console.log("[SAFE BYPASS] Wiping AI payload entirely to guarantee format compliance...");
                                aiResponse = { hook: null, script: null, caption: null, comment_cta: null, image_prompt: null };
                                aiResponse = applySafeTemplateOverride(isBrandPr ? "brand" : "general", console.log);
                                base64Image = null; // force image rebuild if not fallbacked
                                imgDecision = "branded_fallback_visual";
                                
                                console.log("[SAFE BYPASS] Approved safe template payload fully substituted.");
                                finalStatus = 'published_safe_template_bypass';
                                nextState = "COMPOSE_VIDEO";
                            } else if (policy === "MANUAL") {
                                console.log(`[REVIEW POLICY] REVIEWER_UNAVAILABLE -> MANUAL`);
                                console.log(`[REVIEW POLICY] Reason: Brand/PR content can be drafted but requires manual approval before publish`);
                                finalStatus = 'ready_for_manual_review';
                                nextState = "COMPOSE_VIDEO";
                            } else {
                                console.log(`[REVIEW POLICY] REVIEWER_UNAVAILABLE -> STOP`);
                                console.log(`[REVIEW POLICY] Reason: High-risk health/science content requires reviewer approval`);
                                finalStatus = "skipped_reviewer_unavailable";
                                nextState = "SKIP_TOPIC";
                            }
                        } else if (["CLAIM_OVERREACH", "SOURCE_TONE_MISMATCH", "HOOK_TOO_WEAK", "SCRIPT_TOO_LONG", "CAPTION_TOO_GENERIC", "CTA_TOO_WEAK", "PLANNER_MISALIGNMENT"].includes(fType)) {
                            nextState = "SMART_RETRY_TEXT";
                        } else if (["VISUAL_NO_SUBJECT", "VISUAL_DISTORTION", "MULTI_LAYER", "GLITCH", "LOW_CLARITY"].includes(fType)) {
                            nextState = "SMART_RETRY_IMAGE";
                        } else if (fType === "FULL_PAYLOAD_MISMATCH") {
                            nextState = "GENERATE_TEXT"; // FULL REGEN
                        } else {
                            nextState = "SMART_RETRY_TEXT"; // Safe fallback
                        }

                    }
                    break;
                
                // -------------------------------------------------------------
                case "SMART_RETRY_TEXT":
                    console.log(`[SMART RETRY] Target Fields: ${reviewJson.failed_component}`);
                    const aiResponseRepaired = await executeSelfHealingStep('AI Repair: Text', 'repair', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const repairPrompt = `You are a targeted repair agent. Repair only the failed text component.
Failure type: ${reviewJson.failure_type}
Instruction: ${reviewJson.repair_instruction}
Inputs:
- pillar: ${plannerStrategy.pillar}
- source topic: ${selectedTopic}
- current hook: ${aiResponse.hook}
- current script: ${aiResponse.script}
- current caption: ${aiResponse.caption}

Output schema:
{
  "agent": "REPAIR_TEXT",
  "status": "PASS",
  "error_code": "NONE",
  "retryable": false,
  "message": "repair complete",
  "data": {
    "updated_fields": {
      "hook": "String",
      "script": "String",
      "caption": "String",
      "image_prompt": "String"
    },
    "repair_summary": "String"
  }
}

CRITICAL OUTPUT RULE:
- You MUST return ONLY valid JSON
- NO explanation
- NO text outside JSON
- If you fail -> your output is rejected`;
                        const completion = await aiClient.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: repairPrompt,
                            config: {
                                response_mime_type: "application/json",
                                response_schema: {
                                    type: Type.OBJECT,
                                    properties: {
                                        agent: { type: Type.STRING },
                                        status: { type: Type.STRING, enum: ["PASS", "RETRYABLE_FAIL", "FATAL_FAIL"] },
                                        error_code: { type: Type.STRING },
                                        retryable: { type: Type.BOOLEAN },
                                        message: { type: Type.STRING },
                                        data: {
                                            type: Type.OBJECT,
                                            properties: {
                                                updated_fields: { type: Type.OBJECT, properties: { hook: { type: Type.STRING }, script: { type: Type.STRING }, caption: { type: Type.STRING }, image_prompt: { type: Type.STRING } } },
                                                repair_summary: { type: Type.STRING }
                                            }
                                        },
                                        meta: { type: Type.OBJECT }
                                    }, required: ["agent", "status", "data"]
                                }
                            }
                        });
                        const parsed = extractJsonObject(completion.text);
                        assertValidAgentResponse(parsed, "REPAIR_TEXT");
                        if(!parsed.data) throw new Error("REPAIR_EMPTY_FIELDS");
                        return parsed.data;
                    });
                    
                    if (!aiResponseRepaired || !aiResponseRepaired.updated_fields) throw new Error("REPAIR_EMPTY_FIELDS");
                    if (aiResponseRepaired.updated_fields.hook) aiResponse.hook = aiResponseRepaired.updated_fields.hook;
                    if (aiResponseRepaired.updated_fields.script) aiResponse.script = aiResponseRepaired.updated_fields.script;
                    if (aiResponseRepaired.updated_fields.caption) aiResponse.caption = aiResponseRepaired.updated_fields.caption;
                    if (aiResponseRepaired.updated_fields.image_prompt) aiResponse.image_prompt = aiResponseRepaired.updated_fields.image_prompt;
                    console.log(`[SMART RETRY] Repair applied: ${aiResponseRepaired.repair_summary}`);
                    
                    nextState = "GENERATE_AUDIO"; // Re-gen audio based on new script
                    break;

                // -------------------------------------------------------------
                case "SMART_RETRY_IMAGE":
                    console.log(`[SMART RETRY] Action: REGENERATE_IMAGE_ONLY`);
                    const imgRepair = await executeSelfHealingStep('AI Repair: Image', 'repair', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const completion = await aiClient.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: `You are a targeted visual repair agent. Failure type: ${reviewJson.failure_type}. Instruction: ${reviewJson.repair_instruction}. Current prompt: ${aiResponse.image_prompt}. Rewrite prompt for clarity.
CRITICAL OUTPUT RULE:
- You MUST return ONLY valid JSON
- NO explanation
- NO text outside JSON
- If you fail -> your output is rejected`,
                            config: {
                                response_mime_type: "application/json",
                                response_schema: { 
                                     type: Type.OBJECT,
                                     properties: {
                                        agent: { type: Type.STRING },
                                        status: { type: Type.STRING, enum: ["PASS", "RETRYABLE_FAIL", "FATAL_FAIL"] },
                                        error_code: { type: Type.STRING },
                                        retryable: { type: Type.BOOLEAN },
                                        message: { type: Type.STRING },
                                        data: {
                                            type: Type.OBJECT,
                                            properties: {
                                                 updated_fields: { type: Type.OBJECT, properties: { image_prompt: { type: Type.STRING } } },
                                                 repair_summary: { type: Type.STRING } 
                                            }
                                        },
                                        meta: { type: Type.OBJECT }
                                    }, required: ["agent", "status", "data"]
                                }
                            }
                        });
                        const parsed = extractJsonObject(completion.text);
                        assertValidAgentResponse(parsed, "REPAIR_IMAGE");
                        if(!parsed.data) throw new Error("REPAIR_EMPTY_FIELDS");
                        return parsed.data;
                    });
                    if (imgRepair && imgRepair.updated_fields && imgRepair.updated_fields.image_prompt) {
                        aiResponse.image_prompt = imgRepair.updated_fields.image_prompt;
                    }
                    nextState = "GENERATE_IMAGE"; // Re-gen image with new prompt
                    break;

                // -------------------------------------------------------------
                case "COMPOSE_VIDEO":
                    assertSafeTemplateIntegrity(aiResponse);
                    if (imgDecision === "branded_fallback_visual") {
                        await sendAlert(context.conn, "warning", `image_fallback_${RUN_ID}`, "Image Generation Degraded", `Fallback engaged`, context);
                        const fallbackSrcPath = path.join(process.cwd(), 'public', 'nutrition-bg.jpg');
                        if (!fs.existsSync(fallbackSrcPath)) {
                            console.error(`[FFMPEG] Missing fallback image at: ${fallbackSrcPath}`);
                            console.log(`[FFMPEG] Auto-generating solid colored fallback background to prevent pipeline crash.`);
                            const ffmpegCmd = process.env.FFMPEG_PATH || (fs.existsSync('/usr/local/bin/ffmpeg') ? '/usr/local/bin/ffmpeg' : 'ffmpeg');
                            require('child_process').execSync(`${ffmpegCmd} -f lavfi -i color=c=0x0A0F1F:s=1080x1920 -vframes 1 "${imgPath}"`, {stdio: 'ignore'});
                        } else {
                            const ffmpegCmd = process.env.FFMPEG_PATH || (fs.existsSync('/usr/local/bin/ffmpeg') ? '/usr/local/bin/ffmpeg' : 'ffmpeg');
                            require('child_process').execSync(`${ffmpegCmd} -y -i "${fallbackSrcPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,colorchannelmixer=rr=0.7:gg=0.7:bb=0.8" -vframes 1 "${imgPath}"`, {stdio: 'ignore'});
                        }
                    }
                    await updateRunLog(context.conn, { current_step: 'ffmpeg_rendering' });
                    
                    const MAX_REEL_DURATION = 30; // 🔒 HARD CAP: 30 seconds for viral reels
                    const rawDuration = safeModeActivated ? 10 : Math.max(8, aiResponse.script.split(' ').length * 0.4) + 2;
                    const safeDuration = Math.min(rawDuration, MAX_REEL_DURATION); // Clamp to 30s max
                    console.log(`[DURATION] Raw: ${rawDuration.toFixed(1)}s → Clamped: ${safeDuration}s (max ${MAX_REEL_DURATION}s)`);
                    const eff = imgDecision === "branded_fallback_visual" ? "" : "zoompan=z='min(zoom+0.0015,1.5)':d=700:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,";
                    const ffmpegMainCmd = process.env.FFMPEG_PATH || (fs.existsSync('/usr/local/bin/ffmpeg') ? '/usr/local/bin/ffmpeg' : 'ffmpeg');
                    require('child_process').execSync(`${ffmpegMainCmd} -y -loop 1 -i "${imgPath}" -i "${audioPath}" -map 0:v -map 1:a -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${eff}format=yuv420p" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t ${safeDuration} "${outPath}"`, { stdio: 'pipe', timeout: 120000 });
                    
                    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 50000) {
                       throw new Error("FFmpeg corrupted output");
                    }
                    
                    nextState = "PUBLISH";
                    break;

                // -------------------------------------------------------------
                case "PUBLISH":
                    if (finalStatus === "ready_for_manual_review") {
                        console.log(`[PUBLISH GUARD] Skipping publish phase. Content marked for manual review.`);
                        nextState = "MEMORY_COMMIT";
                        break;
                    }
                    await executeSelfHealingStep('Graph Publishing', 'publish', context, async () => {
                         let publish_mode = "normal";
                         if (aiResponse && aiResponse.__safe_template_mode === true) {
                             publish_mode = "safe_template";
                         } else if (attempt > 0) {
                             publish_mode = "repaired";
                         }

                         if (process.env.PUBLISH_ENABLED !== 'true') {
                             console.log(`[PUBLISH GUARD] PUBLISH_ENABLED is false. Simulating successful Graph API upload...`);
                             console.log(`[LIVE POST] PostID=SIMULATED | RunID=${RUN_ID} | Mode=${publish_mode}`);
                             return;
                         }
                         const form = new FormData();
                         form.append('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
                         form.append('description', `🚨 New Detail: ${selectedTopic}\n\n${aiResponse.caption}\n\n#NadaniaWellness`);
                         form.append('source', fs.createReadStream(outPath));
                         const res = await axios.post(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/videos`, form, { headers: form.getHeaders(), maxBodyLength: Infinity });
                         if(res.data && res.data.id) {
                             console.log(`[LIVE POST] PostID=${res.data.id} | RunID=${RUN_ID} | Mode=${publish_mode}`);
                             // Store post_id in reel_content_versions so Graph Observer can track metrics
                             try {
                                 await context.conn.execute(
                                     `INSERT INTO reel_content_versions (run_id, post_id, version_number, version_role, publish_status, hook, script, caption, comment_cta, image_prompt, created_at)
                                      VALUES (?, ?, 1, 'base', 'published', ?, ?, ?, ?, ?, NOW())`,
                                     [RUN_ID, res.data.id, aiResponse.hook, aiResponse.script, aiResponse.caption, aiResponse.comment_cta, aiResponse.image_prompt]
                                 );
                                 console.log(`[OBSERVER BRIDGE] Stored post_id=${res.data.id} in reel_content_versions for metric tracking`);
                             } catch (dbErr) {
                                 console.error(`[OBSERVER BRIDGE] Failed to store post_id: ${dbErr.message}`);
                             }
                             try { 
                                 if(process.env.LIVE_FIRE_TEST === 'COMMENT') throw new Error("LIVE TEST: Intentionally failed comment injection!");
                                 await axios.post(`https://graph.facebook.com/v19.0/${res.data.id}/comments`, { 
                                     message: aiResponse.comment_cta + "\n\n👉 Check your symptoms & get a FREE AI health assessment here: https://nadaniadigitalllc.com/wellness", 
                                     access_token: process.env.FB_PAGE_ACCESS_TOKEN 
                                 }); 
                             } catch(cErr) {
                                 finalStatus = 'posted_no_comment';
                                 await sendAlert(context.conn, "warning", "meta_comment_failure", "Comment Ping Failed", cErr.message, { ...context, cooldownHrs: process.env.LIVE_FIRE_TEST ? 0 : 1 });
                             }
                         }
                    });
                    
                    nextState = "MEMORY_COMMIT";
                    break;

                // -------------------------------------------------------------
                case "MEMORY_COMMIT":
                    const finalPillar = plannerStrategy && plannerStrategy.pillar ? plannerStrategy.pillar : null;
                    const finalAngle = plannerStrategy && plannerStrategy.topic_angle ? plannerStrategy.topic_angle : null;
                    await context.conn.execute(
                        "UPDATE health_reels_queue SET status = ?, locked_by = NULL, posted_at = CURRENT_TIMESTAMP, content_pillar = ?, topic_angle = ? WHERE id = ?", 
                        [finalStatus, finalPillar, finalAngle, topicId]
                    );
                    await updateRunLog(context.conn, { status: finalStatus, completed_at: new Date(), current_step: 'completed', duration_ms: Date.now() - startTime });
                    console.log(`✅ System Graceful Exit. Target Status: ${finalStatus}`);
                    
                    nextState = "COMPLETE";
                    break;

                // -------------------------------------------------------------
                case "SKIP_TOPIC":
                    await context.conn.execute("UPDATE health_reels_queue SET status = ?, locked_by = NULL, updated_at = NOW() WHERE id = ?", [finalStatus, topicId]);
                    await updateRunLog(context.conn, { status: finalStatus, completed_at: new Date(), current_step: 'skipped', error_summary: 'Topic evaluated as extreme editorial risk and skipped.', duration_ms: Date.now() - startTime });
                    console.log(`[STATE] Skipping high-risk topic. Marked as ${finalStatus} in database.`);
                     
                    // Clean memory for next
                    aiResponse = null;
                    base64Image = null;
                    imgDecision = null;
                    reviewJson = null;
                    attempt = 0;
                     
                    nextState = "PICK_NEXT_TOPIC";
                    break;
                     
                // -------------------------------------------------------------
                case "PICK_NEXT_TOPIC":
                    let [nextLock] = await context.conn.execute("UPDATE health_reels_queue SET status = 'processing_lock', locked_by = ?, updated_at = NOW() WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1", [RUN_ID]);
                    if (nextLock.affectedRows === 0) {
                         console.log("No more pending topics available. Graceful system exit.");
                         nextState = "COMPLETE";
                         break;
                    }
                    const [nextRows] = await context.conn.execute("SELECT id, topic FROM health_reels_queue WHERE locked_by = ?", [RUN_ID]);
                    if (nextRows.length === 0) {
                         nextState = "COMPLETE";
                         break;
                    }
                    selectedTopic = nextRows[0].topic;
                    topicId = nextRows[0].id;
                    context.topic = selectedTopic;
                    console.log(`🔒 Acquired Next Idempotency Lock on Topic ID ${topicId}: ${selectedTopic}`);
                    nextState = "PLAN_STRATEGY";
                    break;

                // -------------------------------------------------------------
                default:
                    throw new Error(`Invalid state transition identified: ${currentState}`);
            }

            console.log(`[STATE] ${currentState} -> ${nextState} | Event: Transition successful`);
            currentState = nextState;

        } catch (err) {
            console.error(`[STATE CRASH] Error encountered in state ${currentState}:`, err.message);
            globalErr = err;
            currentState = "FATAL_STOP";
        }
    }

    if (currentState === "FATAL_STOP") {
        if (context.conn) {
            await updateRunLog(context.conn, { status: 'failed', completed_at: new Date(), error_summary: globalErr?.message, duration_ms: Date.now() - startTime });
            if (topicId) await triggerRecoveryRun(context.conn, topicId, context);
            await context.conn.end();
        }
        console.error("🚨 FATAL STOP:", globalErr?.stack || globalErr);
        process.exit(1);
    } else {
        if (context.conn) await context.conn.end();
    }
}
main();

