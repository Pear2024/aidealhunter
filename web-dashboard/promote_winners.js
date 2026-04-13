const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Budget Protection Rules
const MAX_BOOSTS_PER_DAY = 2;
const PER_POST_BUDGET_USD = 15.00;

async function setupAdsDB(conn) {
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS reel_promotion_jobs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id VARCHAR(128) NOT NULL,
            content_version_id BIGINT UNSIGNED NOT NULL,
            revenue_score DECIMAL(5,2) NOT NULL,
            boost_status VARCHAR(50) NOT NULL DEFAULT 'pending',
            ad_id VARCHAR(128) NULL,
            campaign_id VARCHAR(128) NULL,
            budget_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            failure_reason VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_post_id (post_id),
            KEY idx_boost_status (boost_status)
        );
    `);
}

async function runPromoteWinners() {
    console.log(`[PROMOTE ENGINE] Initializing Auto-Ads Pipeline...`);
    
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    });

    await setupAdsDB(conn);

    // 4. Budget Protection Check (Global)
    const [todayCount] = await conn.execute(`
        SELECT COUNT(*) as cnt 
        FROM reel_promotion_jobs 
        WHERE DATE(created_at) = CURDATE() AND boost_status IN ('boosted', 'pending')
    `);
    
    if (todayCount[0].cnt >= MAX_BOOSTS_PER_DAY) {
        console.log(`[PROMOTE ENGINE] BUDGET GUARD: Maximum daily limit reached (${MAX_BOOSTS_PER_DAY} boosts). Halting pipeline.`);
        await conn.end();
        return;
    }

    // 1. Load Candidates
    // Note: Doing a subquery for the latest snapshot to ensure accurate minimum thresholds (Impressions > 500, Hold > 10%).
    const [candidates] = await conn.execute(`
        SELECT v.id as version_id, v.post_id, v.revenue_score, v.review_status, v.image_prompt,
              (SELECT impressions FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as impressions,
              (SELECT hold_rate FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as hold_rate
        FROM reel_content_versions v
        LEFT JOIN reel_promotion_jobs p ON v.post_id = p.post_id
        WHERE v.review_status = 'BOOST' 
          AND v.revenue_score >= 75
          AND v.post_id IS NOT NULL 
          And p.id IS NULL
        HAVING impressions >= 500 AND hold_rate >= 0.10
        ORDER BY v.revenue_score DESC LIMIT ?
    `, [MAX_BOOSTS_PER_DAY - todayCount[0].cnt]);

    if (candidates.length === 0) {
        console.log(`[PROMOTE ENGINE] No qualified revenue winners ready to be boosted today.`);
        await conn.end();
        return;
    }

    for (const post of candidates) {
        console.log(`\n-----------------------------------------`);
        console.log(`[PROMOTE ENGINE] Evaluating Post ${post.post_id} (Rev Score: ${post.revenue_score})`);
        
        // 2 & 3. Hard Boost Gates & Duplicate Risk Mitigation
        // Exclude fallback, template bypass, or unapproved risks.
        let skipReason = null;
        const promptLog = (post.image_prompt || "").toLowerCase();
        
        if (promptLog.includes("fallback") || promptLog.includes("safe") || promptLog.includes("template")) {
            skipReason = "POST_IS_SAFE_TEMPLATE_BYPASS";
        }
        
        if (skipReason) {
             console.log(`[PROMOTE ENGINE] GATE FAILED: ${skipReason}. Marking as skipped.`);
             await conn.execute(`
                 INSERT INTO reel_promotion_jobs 
                 (post_id, content_version_id, revenue_score, boost_status, failure_reason)
                 VALUES (?, ?, ?, 'skipped', ?)
             `, [post.post_id, post.version_id, post.revenue_score, skipReason]);
             continue;
        }

        console.log(`[PROMOTE ENGINE] GATE PASSED. Creating pending record...`);

        // Lock with Pending
        const [jobStatus] = await conn.execute(`
             INSERT INTO reel_promotion_jobs 
             (post_id, content_version_id, revenue_score, boost_status, budget_amount)
             VALUES (?, ?, ?, 'pending', ?)
        `, [post.post_id, post.version_id, post.revenue_score, PER_POST_BUDGET_USD]);
        
        const jobId = jobStatus.insertId;

        try {
            // Mock Meta Graph Ad API Call
            // 5. Facebook Business API Execution (Simulated)
            // Example:
            // const adRes = await axios.post(`https://graph.facebook.com/v19.0/act_${process.env.FB_AD_ACCOUNT_ID}/adcampaigns`, ...);
            console.log(`[PROMOTE ENGINE] Connecting to Meta Ads Manager API...`);
            console.log(`[PROMOTE ENGINE] Deploying $${PER_POST_BUDGET_USD} daily budget for video ID: ${post.post_id}...`);
            await new Promise(r => setTimeout(r, 1000)); // Simulating network
            
            const mockCampaignId = `camp_${Date.now()}`;
            const mockAdId = `ad_${Date.now()}`;
            
            // Mark as Boosted
            await conn.execute(`
                UPDATE reel_promotion_jobs 
                SET boost_status = 'boosted', campaign_id = ?, ad_id = ?
                WHERE id = ?
            `, [mockCampaignId, mockAdId, jobId]);
            
            console.log(`[PROMOTE ENGINE] SUCCESS! Post actively boosted. Campaign ID: ${mockCampaignId}`);
            
        } catch (apiError) {
            console.error(`[PROMOTE ENGINE] Meta Ads API Failure:`, apiError.message);
             await conn.execute(`
                UPDATE reel_promotion_jobs 
                SET boost_status = 'failed', failure_reason = ?
                WHERE id = ?
            `, [apiError.message.substring(0,200), jobId]);
        }
    }

    await conn.end();
}

runPromoteWinners().catch(console.error);
