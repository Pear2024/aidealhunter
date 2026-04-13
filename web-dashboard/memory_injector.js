const mysql = require('mysql2/promise');
const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function extractMemory() {
    console.log(`[MEMORY INJECTOR] Fetching optimization history to build systemic memory...`);
    
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    });

    // Bring in results that show an improvement
    const [results] = await conn.execute(`
        SELECT r.improvement_comment_rate, r.improvement_hold_rate, 
               vo.hook as opt_hook, vo.comment_cta as opt_cta, vo.caption as opt_caption,
               vr.hook as orig_hook, vr.comment_cta as orig_cta, vr.caption as orig_caption
        FROM reel_optimization_results r
        JOIN reel_content_versions vo ON r.optimized_version_id = vo.id
        JOIN reel_content_versions vr ON r.original_version_id = vr.id
        ORDER BY r.created_at DESC LIMIT 20
    `);

    await conn.end();

    if (results.length === 0) {
        console.log(`[MEMORY INJECTOR] Not enough history to extract patterns just yet. Wait for optimization cycles.`);
        return;
    }

    // Separate Data implicitly via formatting
    let payloadStr = "=== OPTIMIZATION HISTORY ===\n";
    results.forEach((row, idx) => {
        const isWinner = parseFloat(row.improvement_comment_rate) > 0 || parseFloat(row.improvement_hold_rate) > 0;
        payloadStr += `\nTest #${idx+1} [${isWinner ? 'SUCCESS - VARIANT STRONGER' : 'FAIL - VARIANT WEAKER'}]\n`;
        payloadStr += `- Original Hook (Weaker): "${row.orig_hook}"\n`;
        payloadStr += `- Optimized Hook (Stronger): "${row.opt_hook}"\n`;
        payloadStr += `- Delta CR: ${row.improvement_comment_rate}\n`;
    });

    console.log(`[MEMORY INJECTOR] Analyzing ${results.length} historical experiments...`);
    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const analyzePrompt = `You are the core Learning Engine for a viral advertising algorithm.
Your task is to analyze historical A/B tests to deduce universal "winning" content rules.

Optimization History Data:
${payloadStr}

Based on this, answer objectively:
1. What specific Hook structures command high hold rates?
2. What CTA phrasing successfully forces high comment rates?
3. What words or phrasing completely fail (Loser patterns to avoid)?

Provide a deeply summarized, action-oriented JSON.`;

    const completion = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: analyzePrompt,
        config: {
            response_mime_type: "application/json",
            response_schema: {
                type: Type.OBJECT,
                properties: {
                    best_hook_styles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    best_cta_styles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    patterns_to_avoid: { type: Type.ARRAY, items: { type: Type.STRING } }
                }, required: ["best_hook_styles", "best_cta_styles", "patterns_to_avoid"]
            }
        }
    });

    const match = completion.text.match(/\{[\s\S]*\}/);
    if(match) {
        const jsonOutput = JSON.parse(match[0]);
        const finalMemory = {
            updated_at: new Date().toISOString(),
            patterns: jsonOutput
        };
        fs.writeFileSync(path.join(process.cwd(), 'historical_winner_patterns.json'), JSON.stringify(finalMemory, null, 2));
        console.log(`[MEMORY INJECTOR] Memory extracted and written successfully! ✨`);
        console.log(`- Acquired ${jsonOutput.best_hook_styles.length} Hook Styles.`);
        console.log(`- Identified ${jsonOutput.patterns_to_avoid.length} toxic patterns to avoid.`);
    } else {
        console.log(`[MEMORY INJECTOR] Failed to parse JSON response.`);
    }
}

extractMemory().catch(console.error);
