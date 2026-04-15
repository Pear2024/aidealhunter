const mysql = require('mysql2/promise');
const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runRevenuePredictor() {
    console.log(`[REVENUE PREDICTOR] Scanning for matured posts to evaluate commercial viability...`);

    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    });

    const targetPostIds = process.argv.slice(2);
    let postFilterStr = "";
    let queryArgs = [];

    if (targetPostIds.length > 0) {
        // e.g. targetPostIds[0] might be "id1,id2,id3" or multiple arguments
        const mergedIds = targetPostIds.join(",").split(",").map(id => id.trim()).filter(Boolean);
        if (mergedIds.length > 0) {
            postFilterStr = `AND v.post_id IN (${mergedIds.map(() => '?').join(',')})`;
            queryArgs = [...mergedIds];
        }
    }

    const [candidates] = await conn.execute(`
        SELECT v.id, v.post_id, v.hook, v.script, v.caption, v.comment_cta, v.visual_style, v.is_winner, v.image_prompt,  
               (SELECT impressions FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as impressions,
               (SELECT comment_rate FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as comment_rate,
               (SELECT hold_rate FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as hold_rate,
               (SELECT avg_watch_time_seconds FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as avg_watch_time
        FROM reel_content_versions v
        WHERE v.post_id IS NOT NULL 
          And v.revenue_score IS NULL
          ${postFilterStr}
        HAVING comment_rate IS NOT NULL
        ORDER BY v.id DESC LIMIT 50
    `, queryArgs);

    if (candidates.length === 0) {
        console.log(`[REVENUE PREDICTOR] No new candidates ready for scoring.`);
        await conn.end();
        return;
    }

    // Load AI Memory if available
    let memoryInjection = "No historical learning memory found.";
    const memPath = path.join(process.cwd(), 'historical_winner_patterns.json');
    if (fs.existsSync(memPath)) {
        try {
            memoryInjection = JSON.stringify(JSON.parse(fs.readFileSync(memPath, 'utf8')).patterns);
        } catch (e) {}
    }

    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    for (const post of candidates) {
        try {
            console.log(`\n-----------------------------------------`);
            console.log(`[REVENUE PREDICTOR] Scoring Post ID: ${post.post_id}`);
            
            const isSafeTemplate = post.image_prompt?.includes('fallback') || post.image_prompt?.includes('safe') ? true : false;
            
            // 1. Gather Raw Telemetry Metrics (Defaults mapped safely if missing)
            const impressionsNum = parseFloat(post.impressions) || 0;
            const cRateFloat = parseFloat(post.comment_rate) || 0;
            const hRateFloat = parseFloat(post.hold_rate) || 0;
            // Simulated / Mocked missing data fields until graph API fully connected
            const sRateFloat = 0.001; // Mock share rate 0.1%
            const avgWatchS = parseFloat(post.avg_watch_time) || 3;
            const videoLenS = 15; // Assumption 15s reel
            const wRatioFloat = avgWatchS / videoLenS;

            // Maturity & Integrity Checks
            if (impressionsNum < 10) {
                console.log(`[REVENUE PREDICTOR] NOT_ENOUGH_DATA: Post has only ${impressionsNum} impressions. Waiting for minimum 10 impressions to evaluate.`);
                continue;
            }
            if (impressionsNum < 500) {
                console.log(`[REVENUE PREDICTOR] EARLY_SCORING: Post has ${impressionsNum} impressions (ideal: 500+). Scoring with available data.`);
            }

            // 2. Normalize with Caps
            // - 2% comment rate = full score -> / 0.02
            // - 35% hold rate = full score -> / 0.35
            // - 0.5% share rate = full score -> / 0.005
            // - 50% watch time ratio = full score -> / 0.5
            
            const commentScore = Math.min(100, (cRateFloat / 0.02) * 100);
            const holdScore = Math.min(100, (hRateFloat / 0.35) * 100);
            const shareScore = Math.min(100, (sRateFloat / 0.005) * 100);
            const watchScore = Math.min(100, (wRatioFloat / 0.50) * 100);
            
            // 3. Computed Mathematical Revenue Score
            let computedScore = (commentScore * 0.45) + (holdScore * 0.25) + (shareScore * 0.20) + (watchScore * 0.10);
            
            // 4. Governance Penalities
            if (isSafeTemplate) computedScore -= 40; // Heavy penalty for bypass

            const finalRevenueScore = Math.max(0, Math.min(100, computedScore));

            // 5. Decision Rules
            let finalDecision = "DO_NOT_BOOST";
            if (finalRevenueScore >= 75) finalDecision = "BOOST";
            else if (finalRevenueScore >= 60) finalDecision = "ORGANIC_ONLY";
            
            // HARD LIMIT POLICY
            if (isSafeTemplate) {
                finalDecision = "DO_NOT_BOOST"; // Absolute blockade
                console.log(`[REVENUE PREDICTOR] HARD_LIMIT: Safe template bypass detected. Demoted to DO_NOT_BOOST regardless of score.`);
            }

            // 6. DB Update Action
            await conn.execute(`
                UPDATE reel_content_versions 
                SET revenue_score = ?, review_status = ? 
                WHERE id = ?
            `, [
                finalRevenueScore.toFixed(2),
                finalDecision,
                post.id
            ]);
            
            console.log(`[REVENUE PREDICTOR] Metrics Extracted: CR=${(cRateFloat*100).toFixed(2)}% | HR=${(hRateFloat*100).toFixed(2)}% | SR=${(sRateFloat*100).toFixed(2)}% | WT=${(wRatioFloat*100).toFixed(2)}%`);
            console.log(`[REVENUE PREDICTOR] Computed Revenue Score: ${finalRevenueScore.toFixed(2)}/100`);
            console.log(`[REVENUE PREDICTOR] Math Decision Output: ${finalDecision}`);
            
            if (finalDecision === 'BOOST') {
                console.log(`🚀 [REVENUE PREDICTOR] FLAG FOR ADS QUEUE: This is a cash-printing candidate!`);
            }
            
        } catch (e) {
            console.error(`[REVENUE PREDICTOR] Error evaluating post ${post.id}: ${e.message}`);
        }
    }

    await conn.end();
}

runRevenuePredictor().catch(console.error);
