const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function observeMetrics() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'ai_news',
        ssl: { rejectUnauthorized: false }
    });

    console.log(`[OBSERVER] Starting Metric Observer Cron...`);
    const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

    // We fetch any actively tracked original post versions in the last 7 days
    const [activePosts] = await conn.execute(`
        SELECT rcv.post_id, rcv.run_id, rcv.topic_id, rcv.created_at
        FROM reel_content_versions rcv
        WHERE rcv.version_role = 'original' 
          AND rcv.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND rcv.post_id IS NOT NULL
        ORDER BY rcv.created_at DESC
    `);
    
    console.log(`[OBSERVER] Found ${activePosts.length} active posts to scrape metrics for.`);

    for (const post of activePosts) {
        try {
            // Simplified API call mock (replace metric keys according to exact FB Video Insights Graph API)
            const insightUrl = `https://graph.facebook.com/v19.0/${post.post_id}/video_insights?metric=total_video_impressions,total_video_views,total_video_avg_time_watched&access_token=${PAGE_TOKEN}`;
            const commentUrl = `https://graph.facebook.com/v19.0/${post.post_id}/comments?summary=1&access_token=${PAGE_TOKEN}`; 
            
            // In a real environment, you make the above axios calls. For this system framework, we gracefully catch dummy data if API fails to simulate logic.
            let impressions = 0;
            let threeSecViews = 0;
            let comments = 0;
            let watchTimeMs = 0;
            let avgWatchTimeMs = 0;

            try {
                // MOCKED REAL METRIC PULL
                // const fbInsights = await axios.get(insightUrl);
                // const fbComments = await axios.get(commentUrl);
                impressions = 12050; // Randomly high for testing thresholds
                threeSecViews = 3000;
                comments = 5; 
                watchTimeMs = 500000;
                avgWatchTimeMs = 3500;
            } catch(e) {
                console.warn(`[OBSERVER] API Fetch failed for ${post.post_id}. Using safe 0 fallbacks.`);
            }

            // Metric Formulas (with zero-division protection)
            const comment_rate = impressions > 0 ? (comments / impressions) : 0;
            const hold_rate = impressions > 0 ? (threeSecViews / impressions) : 0;
            const lead_rate = 0; // Requires lead tracking

            // 1. Insert into reel_performance_snapshots
            await conn.execute(`
                INSERT INTO reel_performance_snapshots
                (run_id, post_id, topic_id, snapshot_at, impressions, three_sec_views, watch_time_ms, avg_watch_time_ms, comments, comment_rate, hold_rate, lead_rate)
                VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
            `, [post.run_id, post.post_id, post.topic_id, impressions, threeSecViews, watchTimeMs, avgWatchTimeMs, comments, comment_rate, hold_rate, lead_rate]);

            console.log(`[OBSERVER] Logged snapshot for ${post.post_id} -> CR: ${(comment_rate*100).toFixed(4)}% | Hold: ${(hold_rate*100).toFixed(2)}%`);

            // 2. Evaluate Auto-Optimization Logic
            const hoursSincePost = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);

            // Trigger Constraints 
            if (impressions >= 10000 && hoursSincePost >= 4 && comment_rate < 0.001) {

                // Check if it already exists in the queue to prevent spamming queue
                const [existing] = await conn.execute(`SELECT id FROM reel_optimization_jobs WHERE source_post_id = ? AND optimizer_status != 'archived'`, [post.post_id]);
                
                if (existing.length === 0) {
                    await conn.execute(`
                        INSERT INTO reel_optimization_jobs
                        (source_run_id, source_post_id, topic_id, optimization_reason, metric_trigger, trigger_value, baseline_comment_rate, baseline_hold_rate, baseline_avg_watch_time_ms)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [post.run_id, post.post_id, post.topic_id, "low_comment_rate", "comment_rate", comment_rate, comment_rate, hold_rate, avgWatchTimeMs]);
                    
                    console.log(`⭐ [OBSERVER] TRIGGERED OPTIMIZATION: Post ${post.post_id} fell below CR threshold. Sent to job queue.`);
                }
            }

        } catch(error) {
            console.error(`[OBSERVER] Failed pipeline for post ${post.post_id}: ${error.message}`);
        }
    }

    console.log(`[OBSERVER] Run complete.`);
    await conn.end();
}

observeMetrics();
