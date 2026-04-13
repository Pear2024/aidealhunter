const fs = require('fs');

const path = '/Users/pear/Documents/AntiGravity/Ai news/AI_Deal_Hunter/web-dashboard/generate_health_reel.js';
let code = fs.readFileSync(path, 'utf8');

const startMarker = "// 🧠 PHASE 1: SCRIPT GEN (Self-Healing)";
const endMarker = "if (imgDecision === \"branded_fallback_visual\") {";

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const newChunk = `// 🧠 SMART RETRY ORCHESTRATOR LOOP
        let attempt = 0;
        let aiResponse = null;
        let base64Image = null;
        let imgDecision = null;
        let reviewJson = null;

        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, \`tts_\${RUN_ID}.mp3\`);
        const imgPath = path.join(tempDir, \`bg_\${RUN_ID}.png\`);
        const outPath = path.join(tempDir, \`final_\${RUN_ID}.mp4\`);

        while (attempt <= 2) {
            // --- 1. TEXT GENERATION / REPAIR ---
            if (attempt === 0 || ["SCRIPT", "HOOK", "CAPTION", "CTA", "FULL_PAYLOAD"].includes(reviewJson?.failed_component)) {
                if (attempt === 0) {
                    aiResponse = await executeSelfHealingStep('AI Script', 'script', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const aiPrompt = \`You are a viral short-form video script expert for Facebook Reels in the health & anti-aging niche.
Your goal is to create a HIGH-RETENTION, SCROLL-STOPPING script that drives users to COMMENT a keyword.

STRATEGIC DIRECTIVES:
- Content Pillar: \${plannerStrategy.pillar}
- Core Topic Angle: \${plannerStrategy.topic_angle} (Drawn from: \${selectedTopic})
- Mandated Hook Style: \${plannerStrategy.hook_style}
- Visual Concept: \${plannerStrategy.visual_style}

Target Audience: Women 25-55. Tone: Direct, Urgent, Emotional, Slightly shocking but credible.

Structure & Tasks:
1. HOOK: Generate a singular, explosive 8-word max hook using "you" or "your". CRITICAL FACTUAL GROUNDING: Your claim strength MUST match the source topic. NEVER claim it actively ages/harms the body unless the source explicitly proves it.
2. SCRIPT: Combine the hook with a short insight hitting their real physical pain. MAX 150 CHARACTERS. BANNED WORD: "discover".
3. CAPTION: Speak directly to the reader. Connect their specific pain to a scientific solution. Force them to comment.
4. COMMENT_CTA: Extreme urgency. Rotate keywords: CELL, SCORE, REPORT.
5. IMAGE_PROMPT: Visual must have heavy emotional impact and a single clear subject. BIG TEXT OVERLAY design.\`;

                        const completion = await aiClient.models.generateContent({
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
                        return JSON.parse(completion.text.replace(/\`\`\`json/i, '').replace(/\`\`\`/i, '').trim().replace(/,\\s*([\\]}])/g, '$1'));
                    });
                    console.log(\`[AGENT 2: CREATOR] Generated Hook: "\${aiResponse.hook}"\`);
                } else {
                    console.log(\`[SMART RETRY] Action: REWRITE_TEXT_ONLY\`);
                    console.log(\`[SMART RETRY] Target Fields: \${reviewJson.failed_component}\`);
                    const aiResponseRepaired = await executeSelfHealingStep('AI Repair: Text', 'script', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const repairPrompt = \`You are a targeted repair agent. Repair only the failed text component.
Failure type: \${reviewJson.failure_type}
Instruction: \${reviewJson.repair_instruction}

Inputs:
- pillar: \${plannerStrategy.pillar}
- source topic: \${selectedTopic}
- current hook: \${aiResponse.hook}
- current script: \${aiResponse.script}
- current caption: \${aiResponse.caption}\`;

                        const completion = await aiClient.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: repairPrompt,
                            config: {
                                response_mime_type: "application/json",
                                response_schema: {
                                    type: Type.OBJECT,
                                    properties: {
                                        updated_fields: { type: Type.OBJECT, properties: { hook: { type: Type.STRING }, script: { type: Type.STRING }, caption: { type: Type.STRING }, image_prompt: { type: Type.STRING } } },
                                        repair_summary: { type: Type.STRING }
                                    }
                                }
                            }
                        });
                        return JSON.parse(completion.text.replace(/\`\`\`json/i, '').replace(/\`\`\`/i, '').trim().replace(/,\\s*([\\]}])/g, '$1'));
                    });
                    
                    if (aiResponseRepaired.updated_fields.hook) aiResponse.hook = aiResponseRepaired.updated_fields.hook;
                    if (aiResponseRepaired.updated_fields.script) aiResponse.script = aiResponseRepaired.updated_fields.script;
                    if (aiResponseRepaired.updated_fields.caption) aiResponse.caption = aiResponseRepaired.updated_fields.caption;
                    console.log(\`[SMART RETRY] Repair applied: \${aiResponseRepaired.repair_summary}\`);
                }

                // 🎙️ PHASE 2: AUDIO
                await executeSelfHealingStep('Audio TTS', 'audio', context, async (provider) => {
                    if (provider === 'google-tts') {
                        const googleTTS = require('google-tts-api');
                        const results = await googleTTS.getAllAudioBase64(aiResponse.script.slice(0, 800), { lang: 'en', slow: false, splitPunct: ',.?' });
                        const base64Buffers = results.map(r => Buffer.from(r.base64, 'base64'));
                        fs.writeFileSync(audioPath, Buffer.concat(base64Buffers));
                    }
                });
            }

            // --- 2. IMAGE GENERATION / REPAIR ---
            if (attempt === 0 || ["IMAGE", "VISUAL", "IMAGE_PROMPT", "FULL_PAYLOAD"].includes(reviewJson?.failed_component)) {
                if (attempt > 0) {
                    console.log(\`[SMART RETRY] Action: REGENERATE_IMAGE_ONLY\`);
                    const imgRepair = await executeSelfHealingStep('AI Repair: Image', 'script', context, async (provider) => {
                        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const completion = await aiClient.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: \`You are a targeted visual repair agent. Failure type: \${reviewJson.failure_type}. Instruction: \${reviewJson.repair_instruction}. Current prompt: \${aiResponse.image_prompt}. Rewrite prompt for clarity.\`,
                            config: {
                                response_mime_type: "application/json",
                                response_schema: { type: Type.OBJECT, properties: { updated_fields: { type: Type.OBJECT, properties: { image_prompt: { type: Type.STRING } } }, repair_summary: { type: Type.STRING } } }
                            }
                        });
                        return JSON.parse(completion.text.replace(/\`\`\`json/i, '').replace(/\`\`\`/i, '').trim().replace(/,\\s*([\\]}])/g, '$1'));
                    });
                    if (imgRepair.updated_fields.image_prompt) aiResponse.image_prompt = imgRepair.updated_fields.image_prompt;
                }

                imgDecision = await executeSelfHealingStep('Image Generation', 'image', context, async (provider) => {
                    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    const response = await aiClient.models.generateImages({
                        model: process.env.GEMINI_IMAGEN_MODEL || 'imagen-4.0-generate-001',
                        prompt: \`Premium vertical health ad design: \${aiResponse.image_prompt}. STRICTLY: Emotional impact, single prominent subject, dark background, cinematic.\`,
                        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' }
                    });
                    if (!response.generatedImages || response.generatedImages.length === 0) throw new Error("Empty image output.");
                    base64Image = response.generatedImages[0].image.imageBytes;
                    fs.writeFileSync(imgPath, Buffer.from(base64Image, 'base64'));
                    return "loaded";
                });
            }

            // --- 3. HOLISTIC REVIEWER ---
            if (attempt > 0) console.log(\`[SMART RETRY] Re-reviewing repaired payload...\`);
            reviewJson = await executeSelfHealingStep('Reviewer Agent', 'script', context, async (provider) => {
                const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const reviewerPrompt = \`You are AGENT 3: REVIEWER.
You review the generated Reel payload against:
1. planner strategy
2. source topic
3. editorial safety
4. visual clarity

STRATEGY:
Pillar: \${plannerStrategy.pillar}
Topic: \${selectedTopic}

CREATED:
Hook: \${aiResponse.hook}
Script: \${aiResponse.script}
Caption: \${aiResponse.caption}

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
status: PASS or FAIL
failure_type: CLAIM_OVERREACH, SOURCE_TONE_MISMATCH, HOOK_TOO_WEAK, VISUAL_NO_SUBJECT, VISUAL_DISTORTION, NONE
failed_component: SCRIPT, HOOK, IMAGE, NONE
repair_instruction: String
scores: {hook: number, script: number, visual: number, alignment: number, overall: number}
reason: String
\`;
                const completion = await aiClient.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [
                        { text: reviewerPrompt },
                        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
                    ],
                    config: {
                        response_mime_type: "application/json",
                        response_schema: {
                           type: Type.OBJECT,
                           properties: {
                                status: { type: Type.STRING },
                                failure_type: { type: Type.STRING },
                                failed_component: { type: Type.STRING },
                                repair_instruction: { type: Type.STRING },
                                scores: { type: Type.OBJECT, properties: { overall: { type: Type.INTEGER } } },
                                reason: { type: Type.STRING }
                           }
                        }
                    }
                });
                return JSON.parse(completion.text.replace(/\`\`\`json/i, '').replace(/\`\`\`/i, '').trim().replace(/,\\s*([\\]}])/g, '$1'));
            });

            console.log(\`[AGENT 3: REVIEWER] Action: \${reviewJson.status} | Failure Type: \${reviewJson.failure_type || 'NONE'} | Component: \${reviewJson.failed_component || 'NONE'} | Reason: \${reviewJson.reason}\`);

            // Insert DB Logging here for analytics
            if (context.conn) {
                await context.conn.execute(
                    "INSERT INTO system_run_logs (run_id, topic_id, retry_sequence, failure_type, failed_component, attempt_status, reviewer_overall_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                    [RUN_ID, topicId, attempt, reviewJson.failure_type || 'NONE', reviewJson.failed_component || 'NONE', reviewJson.status, reviewJson.scores?.overall || 0]
                ).catch(e => {}); // Ignore schema errors safely
            }

            if (reviewJson.status === "PASS") {
                console.log(\`[SMART RETRY] Success | Attempt: \${attempt} | Reviewer Overall Score: \${reviewJson.scores?.overall}\`);
                console.log(\`[AGENT 3: REVIEWER] Text Safety: PASS\`);
                console.log(\`[AGENT 3: REVIEWER] ✅ PASS - Payload verified high-quality.\`);
                break;
            } else {
                console.log(\`[SMART RETRY] Failed | Attempt: \${attempt} | Failure Type: \${reviewJson.failure_type}\`);
                if (attempt >= 2 || reviewJson.failure_type === "FATAL_REJECTED") {
                    console.log(\`[SMART RETRY] Exhausted | Final Action: FATAL_REJECTED\`);
                    throw new Error(\`[FATAL_REJECTED] Smart Retry exhausted on: \${reviewJson.failure_type}\`);
                }
                attempt++;
                console.log(\`[SMART RETRY] Triggered | Failure Type: \${reviewJson.failure_type} | Component: \${reviewJson.failed_component} | Attempt: \${attempt}\`);
            }
        }

        `;

fs.writeFileSync(path, code.substring(0, startIdx) + newChunk + code.substring(endIdx));
console.log("Successfully injected Smart Retry Orchestrator Architecture");
