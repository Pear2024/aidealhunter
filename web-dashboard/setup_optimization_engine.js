const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function setupDB() {
        const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    });

    console.log("Connected to DB, creating optimization schemas...");

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS reel_performance_snapshots (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          run_id VARCHAR(64) NOT NULL,
          post_id VARCHAR(128) NOT NULL,
          topic_id BIGINT UNSIGNED NULL,
          snapshot_at DATETIME NOT NULL,
          impressions INT UNSIGNED NOT NULL DEFAULT 0,
          three_sec_views INT UNSIGNED NOT NULL DEFAULT 0,
          watch_time_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,
          avg_watch_time_ms INT UNSIGNED NOT NULL DEFAULT 0,
          comments INT UNSIGNED NOT NULL DEFAULT 0,
          shares INT UNSIGNED NOT NULL DEFAULT 0,
          reactions INT UNSIGNED NOT NULL DEFAULT 0,
          clicks INT UNSIGNED NOT NULL DEFAULT 0,
          leads INT UNSIGNED NOT NULL DEFAULT 0,
          comment_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
          hold_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
          lead_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_post_snapshot (post_id, snapshot_at),
          KEY idx_run_id (run_id),
          KEY idx_topic_id (topic_id)
        );
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS reel_optimization_jobs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          source_run_id VARCHAR(64) NOT NULL,
          source_post_id VARCHAR(128) NOT NULL,
          topic_id BIGINT UNSIGNED NULL,
          optimization_reason VARCHAR(255) NOT NULL,
          metric_trigger VARCHAR(100) NOT NULL,
          trigger_value DECIMAL(10,6) NULL,
          baseline_comment_rate DECIMAL(10,6) NULL,
          baseline_hold_rate DECIMAL(10,6) NULL,
          baseline_avg_watch_time_ms INT UNSIGNED NULL,
          optimizer_status VARCHAR(50) NOT NULL DEFAULT 'pending',
          retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_source_post (source_post_id),
          KEY idx_source_run (source_run_id),
          KEY idx_optimizer_status (optimizer_status)
        );
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS reel_content_versions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          optimization_job_id BIGINT UNSIGNED NULL,
          version_number INT UNSIGNED NOT NULL,
          version_role VARCHAR(50) NOT NULL,
          run_id VARCHAR(64) NULL,
          post_id VARCHAR(128) NULL,
          hook TEXT NULL,
          script TEXT NULL,
          caption TEXT NULL,
          comment_cta TEXT NULL,
          image_prompt TEXT NULL,
          overlay_text TEXT NULL,
          visual_style VARCHAR(100) NULL,
          cta_keyword VARCHAR(50) NULL,
          revenue_score DECIMAL(5,2) NULL,
          comment_potential DECIMAL(5,2) NULL,
          review_status VARCHAR(50) NULL,
          publish_status VARCHAR(50) NULL,
          is_winner TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_run_id (run_id),
          KEY idx_post_id (post_id),
          KEY idx_job_id (optimization_job_id),
          CONSTRAINT fk_versions_job
            FOREIGN KEY (optimization_job_id) REFERENCES reel_optimization_jobs(id)
            ON DELETE CASCADE
        );
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS reel_optimization_results (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          optimization_job_id BIGINT UNSIGNED NOT NULL,
          original_version_id BIGINT UNSIGNED NOT NULL,
          optimized_version_id BIGINT UNSIGNED NOT NULL,
          comparison_window_hours INT UNSIGNED NOT NULL DEFAULT 24,
          original_comment_rate DECIMAL(10,6) NULL,
          optimized_comment_rate DECIMAL(10,6) NULL,
          original_hold_rate DECIMAL(10,6) NULL,
          optimized_hold_rate DECIMAL(10,6) NULL,
          original_avg_watch_time_ms INT UNSIGNED NULL,
          optimized_avg_watch_time_ms INT UNSIGNED NULL,
          improvement_comment_rate DECIMAL(10,6) NULL,
          improvement_hold_rate DECIMAL(10,6) NULL,
          winner_version_id BIGINT UNSIGNED NULL,
          decision_reason VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_job_id (optimization_job_id),
          CONSTRAINT fk_results_job
            FOREIGN KEY (optimization_job_id) REFERENCES reel_optimization_jobs(id)
            ON DELETE CASCADE
        );
    `);

    console.log("✅ Custom Schema: 4 Optimization Tables Created Successfully!");
    process.exit(0);
}

setupDB().catch(console.error);
