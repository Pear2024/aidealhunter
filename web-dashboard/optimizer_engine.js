const mysql = require('mysql2/promise');
const { GoogleGenAI, Type } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

async function runOptimizer() {
    const conn = await mysql.createConnection(process.env.MYSQL_URI || {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    });
    
    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    console.log(`[AGENT 4: OPTIMIZER] Booting optimization engine...`);

    // 1. Pull optimization queue with Idempotent Lock
    const [pendingJobs] = await conn.execute(`
        SELECT id FROM reel_optimization_jobs 
        WHERE optimizer_status = 'pending' 
        ORDER BY created_at ASC LIMIT 5
    `);
    
    if (pendingJobs.length === 0) {
        console.log(`[AGENT 4: OPTIMIZER] No pending jobs. Checking if any comparison windows have closed...`);
        await evaluateCompletedJobs(conn);
        await conn.end();
        return;
    }

    // Try to acquire locks Atomically
    const jobIdsToProcess = [];
    for (const pJob of pendingJobs) {
        const [lockResult] = await conn.execute(`
            UPDATE reel_optimization_jobs 
            SET optimizer_status = 'analyzing', updated_at = NOW() 
            WHERE id = ? AND optimizer_status = 'pending'
        `, [pJob.id]);
        if (lockResult.affectedRows === 1) jobIdsToProcess.push(pJob.id);
    }
    
    if (jobIdsToProcess.length === 0) {
        console.log(`[AGENT 4: OPTIMIZER] Jobs were sniped by another worker process. Exiting gracefully.`);
        await conn.end();
        return;
    }

    // Fetch full data for locked jobs
    const [jobs] = await conn.query(`SELECT * FROM reel_optimization_jobs WHERE id IN (?)`, [jobIdsToProcess.length > 0 ? jobIdsToProcess : [-1]]);

    for (const job of jobs) {
        try {
            console.log(`\n-----------------------------------------`);
            console.log(`[AGENT 4: OPTIMIZER] Loaded job ${job.id} for source post ${job.source_post_id}`);
            console.log(`[AGENT 4: OPTIMIZER] Baseline metrics: hold_rate=${job.baseline_hold_rate}, comment_rate=${job.baseline_comment_rate}`);
            
            // Load original version
            const [versions] = await conn.execute(`
                SELECT * FROM reel_content_versions 
                WHERE post_id = ? ORDER BY version_number DESC LIMIT 1
            `, [job.source_post_id]);
            
            if (versions.length === 0) {
                throw new Error("Target original version not found in reel_content_versions.");
            }
            
            const original = versions[0];
            const nextVersionNumber = original.version_number + 1;
            
            // 2. Analyze Reason to Optimize
            let targetFields = [];
            let directive = "";
            let shouldSkip = false;
            
            const cr = parseFloat(job.baseline_comment_rate);
            const hr = parseFloat(job.baseline_hold_rate);
            
            // Matrix Rules Evaluation
            if (hr < 0.05 && cr < 0.0005) {
                // All very low
                shouldSkip = true;
                directive = "Metrics too low to redeem.";
            } else if (hr >= 0.10 && cr < 0.001) {
                // comment_rate low but hold_rate is somewhat ok -> optimize hook + CTA
                targetFields = ["hook", "comment_cta"];
                directive = "Hold rate is acceptable, but comment rate is extremely low. We need a stronger emotional trigger in the hook and a more urgent call-to-action that makes commenting feel mandatory.";
            } else if (hr < 0.10) {
                // hold_rate low -> optimize hook + first-line script
                targetFields = ["hook", "script"];
                directive = "Hold rate is remarkably poor (users scroll away immediately). We need a sharper, more confrontational hook and a faster setup script to grab attention instantly without delay.";
            } else {
                targetFields = ["caption", "comment_cta"];
                directive = "Underperforming overall engagement. Tweak the caption to seamlessly bridge the curiosity gap and make the CTA irresistible.";
            }
            
            if (shouldSkip) {
                console.log(`[AGENT 4: OPTIMIZER] Optimization target: SKIPPED`);
                console.log(`[AGENT 4: OPTIMIZER] Reason: Engine assessed metrics are irredeemable (HR: ${hr}, CR: ${cr})`);
                await conn.execute(`UPDATE reel_optimization_jobs SET optimizer_status = 'skipped', optimization_reason = 'irredeemable', updated_at = NOW() WHERE id = ?`, [job.id]);
                continue;
            }
            
            // 4. Safety Guard for Medical Topics
            let safetyGuard = "";
            try {
                // Determine if topic is high-risk health by fetching previous run context if possible
                // Fallback to strict constraint universally since this is the health reel pipeline:
                safetyGuard = "CRITICAL SAFETY GUARD POLICY: This content may relate to health/medical topics. You MUST NOT exaggerate claims, make promises of cures, or increase the severity of the original health claim. Focus ONLY on engaging the curiosity/identity trigger smoothly.";
            } catch (e) {}
            
            console.log(`[AGENT 4: OPTIMIZER] Optimization target: ${targetFields.join(" + ").toUpperCase()}`);
            console.log(`[AGENT 4: OPTIMIZER] Fields allowed to change: ${targetFields.join(", ")}`);
            
            // 3. Generate Optimized Variant
            const aiPrompt = `You are an elite short-form video optimization AI.
Your target is to improve a failed Facebook Reel by editing ONLY specific parts.
DIRECTIVE: ${directive}
${safetyGuard}

Original Payload:
Hook: ${original.hook}
Script: ${original.script}
Caption: ${original.caption}
CTA: ${original.comment_cta}

You may ONLY provide new, highly-optimized variations for the following fields: [${targetFields.join(", ")}].
For the fields you are NOT told to optimize, return them exactly as they were in the original payload.

CRITICAL JSON RULES:
- Return ONLY 1 valid JSON object matching the exact original keys ({hook, script, caption, comment_cta, image_prompt}).
- Keep the exact original 'image_prompt'.
- Do not output any prose outside JSON.
- Never wrap in code blocks (\`\`\`).`;

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
            
            const match = completion.text.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("JSON not found in AI response");
            const optimizedPayload = JSON.parse(match[0]);
            
            // 4. Record to Database
            // Note: post_id is NULL here because it hasn't been posted yet. The compositing and publishing pipeline will update this when actually posted.
            await conn.execute(`
                INSERT INTO reel_content_versions 
                (optimization_job_id, version_number, version_role, run_id, hook, script, caption, comment_cta, image_prompt, is_winner)
                VALUES (?, ?, 'optimized', ?, ?, ?, ?, ?, ?, 0)
            `, [
                job.id, 
                nextVersionNumber, 
                job.source_run_id, 
                optimizedPayload.hook, 
                optimizedPayload.script, 
                optimizedPayload.caption, 
                optimizedPayload.comment_cta, 
                optimizedPayload.image_prompt
            ]);
            
            await conn.execute(`UPDATE reel_optimization_jobs SET optimizer_status = 'variant_generated', updated_at = NOW() WHERE id = ?`, [job.id]);
            
            console.log(`[AGENT 4: OPTIMIZER] Created version ${nextVersionNumber} successfully`);
            console.log(`[AGENT 4: OPTIMIZER] Status: variant_generated`);

        } catch (jobErr) {
            console.error(`[AGENT 4: OPTIMIZER] Failed on job ${job.id}: ${jobErr.message}`);
            await conn.execute(`UPDATE reel_optimization_jobs SET optimizer_status = 'failed', updated_at = NOW() WHERE id = ?`, [job.id]);
        }
    }
    
    // Evaluate completions right after loop
    await evaluateCompletedJobs(conn);
    await conn.end();
}

async function evaluateCompletedJobs(conn) {
    // 5. Comparison Window Evaluator
    console.log(`\n-----------------------------------------`);
    console.log(`[AGENT 4: ORCHESTRATOR] Checking for mature comparison windows...`);
    
    // Find published variants older than 24h
    const [runningTests] = await conn.execute(`
        SELECT j.id, j.source_post_id, j.baseline_comment_rate, j.baseline_hold_rate, 
               v1.id as original_version_id, v2.id as optimized_version_id,
               v2.post_id as optimized_post_id, v2.created_at as optimized_created_at
        FROM reel_optimization_jobs j
        JOIN reel_content_versions v1 ON v1.post_id = j.source_post_id AND v1.version_role = 'original'
        JOIN reel_content_versions v2 ON v2.optimization_job_id = j.id AND v2.version_role = 'optimized' AND v2.publish_status = 'published'
        WHERE j.optimizer_status = 'published_variant'
          AND v2.created_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    
    if (runningTests.length === 0) {
        console.log(`[AGENT 4: ORCHESTRATOR] 0 pending evaluations.`);
        return;
    }

    for (const test of runningTests) {
       // Lookup final stats for Variant
       const [optSnapshots] = await conn.execute(`
           SELECT comment_rate, hold_rate, avg_watch_time_ms 
           FROM reel_performance_snapshots 
           WHERE post_id = ? ORDER BY snapshot_at DESC LIMIT 1
       `, [test.optimized_post_id]);
       
       if (optSnapshots.length === 0) continue;
       
       const optStats = optSnapshots[0];
       const crImprovement = optStats.comment_rate - test.baseline_comment_rate;
       const hrImprovement = optStats.hold_rate - test.baseline_hold_rate;
       
       const isWin = crImprovement > 0;
       const winner_id = isWin ? test.optimized_version_id : test.original_version_id;
       const reason = isWin ? "Variant achieved higher comment rate" : "Variant failed to beat baseline. Control wins.";
       
       await conn.execute(`
            INSERT INTO reel_optimization_results
            (optimization_job_id, original_version_id, optimized_version_id, comparison_window_hours, 
             original_comment_rate, optimized_comment_rate, original_hold_rate, optimized_hold_rate,
             improvement_comment_rate, improvement_hold_rate, winner_version_id, decision_reason)
            VALUES (?, ?, ?, 24, ?, ?, ?, ?, ?, ?, ?, ?)
       `, [
            test.id, test.original_version_id, test.optimized_version_id,
            test.baseline_comment_rate, optStats.comment_rate,
            test.baseline_hold_rate, optStats.hold_rate,
            crImprovement, hrImprovement, winner_id, reason
       ]);
       
       // Update flags
       await conn.execute(`UPDATE reel_content_versions SET is_winner = 1 WHERE id = ?`, [winner_id]);
       await conn.execute(`UPDATE reel_optimization_jobs SET optimizer_status = 'completed', updated_at = NOW() WHERE id = ?`, [test.id]);
       
       console.log(`[AGENT 4: OPTIMIZER] Evaluating job ${test.id}...`);
       console.log(`[AGENT 4: OPTIMIZER] Original vs Optimized delta: CR: ${crImprovement.toFixed(6)}, HR: ${hrImprovement.toFixed(4)}`);
       console.log(`[AGENT 4: OPTIMIZER] Winner version: ${winner_id}`);
    }
}

runOptimizer().catch(console.error);
