const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    });

    const post_id = 'test_post_' + Date.now();
    const run_id = 'test_run_' + Date.now();

    await conn.execute(`
        INSERT INTO reel_content_versions 
        (version_number, version_role, run_id, post_id, hook, script, caption, comment_cta, image_prompt, is_winner) 
        VALUES (1, 'original', ?, ?, 'Your aging starts today.', 'Here is why you should care.', 'Check this out.', 'Comment CELL for the guide.', 'A dark microscopic view of cells.', 0)
    `, [run_id, post_id]);

    const [jobResult] = await conn.execute(`
        INSERT INTO reel_optimization_jobs 
        (source_run_id, source_post_id, optimization_reason, metric_trigger, baseline_comment_rate, baseline_hold_rate, optimizer_status)
        VALUES (?, ?, 'low_comment_rate', 'comment_rate', 0.0001, 0.20, 'pending')
    `, [run_id, post_id]);

    console.log("Seeding done, Job ID: ", jobResult.insertId, " for Post: ", post_id);
    
    // Create an old completed job to test evaluation logic
    const old_post_id = 'test_post_old_eval';
    const old_run_id = 'test_run_old';
    
    await conn.execute(`
        INSERT INTO reel_performance_snapshots 
        (run_id, post_id, snapshot_at, impressions, comment_rate, hold_rate) 
        VALUES ('test_run_old', 'test_post_old_eval_variant', NOW(), 5000, 0.05, 0.25)
    `);

    const [oldJob] = await conn.execute(`
        INSERT INTO reel_optimization_jobs 
        (source_run_id, source_post_id, optimization_reason, metric_trigger, baseline_comment_rate, baseline_hold_rate, optimizer_status)
        VALUES (?, ?, 'eval_test', 'comment_rate', 0.01, 0.20, 'published_variant')
    `, [old_run_id, old_post_id]);
    
    await conn.execute(`
        INSERT INTO reel_content_versions 
        (optimization_job_id, version_number, version_role, post_id, run_id, hook, is_winner) 
        VALUES (?, 1, 'original', ?, ?, 'Old Original.', 0)
    `, [oldJob.insertId, old_post_id, old_run_id]);
    
    await conn.execute(`
        INSERT INTO reel_content_versions 
        (optimization_job_id, version_number, version_role, post_id, run_id, hook, publish_status, created_at, is_winner) 
        VALUES (?, 2, 'optimized', 'test_post_old_eval_variant', ?, 'Variant hook', 'published', DATE_SUB(NOW(), INTERVAL 48 HOUR), 0)
    `, [oldJob.insertId, old_run_id]);
    
    console.log("Seeded completed evaluation data.");
    process.exit(0);
}
run();
