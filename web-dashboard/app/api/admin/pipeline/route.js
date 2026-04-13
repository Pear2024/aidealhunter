import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

function getDbConfig() {
    return {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    };
}

export async function GET() {
    try {
        const conn = await mysql.createConnection(getDbConfig());

        const [counts] = await conn.execute(`
            SELECT status, COUNT(*) as count 
            FROM health_reels_queue 
            WHERE DATE(created_at) = CURDATE() 
            GROUP BY status
        `);

        // Get 20 recent runs
        const [recentRuns] = await conn.execute(`
            SELECT id, run_id, topic, status, current_step, created_at, posted_at, safe_mode_active
            FROM health_reels_queue
            ORDER BY id DESC LIMIT 20
        `);

        await conn.end();

        return NextResponse.json({
            status_counts: counts,
            recent_runs: recentRuns
        });
    } catch (e) {
        console.error("Pipeline API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
