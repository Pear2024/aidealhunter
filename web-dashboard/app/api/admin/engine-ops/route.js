import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
    let conn;
    try {
        const dbConfig = {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT || 3306,
        };

        if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
            return NextResponse.json({ error: "Missing DB credentials" }, { status: 500 });
        }

        conn = await mysql.createConnection(dbConfig);

        // 1. Today's Runs & Topic Audit Trail
        const [recentLogs] = await conn.execute(`
            SELECT run_id, started_at, completed_at, status, current_step, provider_used, selected_topic, error_summary, duration_ms
            FROM system_run_logs
            ORDER BY started_at DESC
            LIMIT 20
        `);

        // 2. Metrics Summary
        const [metrics] = await conn.execute(`
            SELECT 
                COUNT(*) as total_runs,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successful_runs,
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_runs
            FROM system_run_logs
            WHERE started_at >= CURDATE()
        `);

        // 3. Alerts Panel
        const [alerts] = await conn.execute(`
            SELECT alert_key, last_alert_at, resolved
            FROM system_alerts_state
            ORDER BY last_alert_at DESC
            LIMIT 10
        `);

        // 4. Provider Distribution (Proxy for Health based on what successfully completed)
        const [providers] = await conn.execute(`
            SELECT provider_used, COUNT(*) as usage_count
            FROM system_run_logs
            WHERE provider_used IS NOT NULL AND status = 'COMPLETED'
            GROUP BY provider_used
        `);

        await conn.end();

        return NextResponse.json({
            logs: recentLogs,
            metrics: metrics[0],
            alerts: alerts,
            providers: providers
        });

    } catch (error) {
        if (conn) await conn.end();
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
