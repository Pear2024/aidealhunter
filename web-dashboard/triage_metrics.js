require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, port: parseInt(process.env.MYSQL_PORT || 3306), ssl: {rejectUnauthorized: false}
    });
    
    let report = {};

    // 2. STATE MACHINE INTEGRITY
    const [runLogs] = await conn.execute("SELECT status, count(*) as count FROM system_run_logs GROUP BY status");
    report.runLogs = runLogs;

    // 3. GRAPH OBSERVER
    const [snapshots] = await conn.execute("SELECT fetch_status, count(*) as count FROM reel_performance_snapshots GROUP BY fetch_status");
    report.snapshot_distribution = snapshots;
    
    const [snapshotsTotal] = await conn.execute("SELECT count(*) as count FROM reel_performance_snapshots");
    report.snapshot_count = snapshotsTotal[0].count;

    const [maturedScoring] = await conn.execute("SELECT COUNT(DISTINCT post_id) as count FROM reel_performance_snapshots WHERE snapshot_at < NOW() - INTERVAL 4 HOUR");
    report.matured_posts = maturedScoring[0].count;

    // 4. REVENUE PREDICTOR
    const [scoredPosts] = await conn.execute("SELECT count(*) as count FROM reel_content_versions WHERE revenue_score IS NOT NULL");
    report.scored_posts = scoredPosts[0].count;
    
    const [decisions] = await conn.execute("SELECT review_status, count(*) as count FROM reel_content_versions GROUP BY review_status");
    report.decision_distribution = decisions;

    // 5. SAFETY & POLICY
    const [safetyPolicy] = await conn.execute(`SELECT status, count(*) as count FROM health_reels_queue WHERE status LIKE '%safe_template%' OR status LIKE '%skipped%' GROUP BY status`);
    report.safety_policy = safetyPolicy;

    // 6. PUBLISH CONTROL
    const [publishActual] = await conn.execute("SELECT count(*) as count FROM health_reels_queue WHERE status = 'posted'");
    report.actual_published = publishActual[0].count;

    console.log(JSON.stringify(report, null, 2));

    await conn.end();
}

run().catch(e => console.error(e));
