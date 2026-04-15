import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

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

        // 1. Fetch Top Matured Posts with Business Metrics
        const [performances] = await conn.execute(`
            SELECT v.post_id, v.hook, v.comment_cta, v.revenue_score, v.review_status as decision, v.is_winner,
                   v.publish_status, v.created_at as version_created_at,
                   (SELECT impressions FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as impressions,
                   (SELECT comments FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as comments,
                   (SELECT comment_rate FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as comment_rate,
                   (SELECT hold_rate FROM reel_performance_snapshots s WHERE s.post_id = v.post_id ORDER BY snapshot_at DESC LIMIT 1) as hold_rate,
                   p.boost_status
            FROM reel_content_versions v
            LEFT JOIN reel_promotion_jobs p ON v.post_id = p.post_id
            WHERE v.post_id IS NOT NULL 
              AND v.post_id NOT LIKE 'test_%'
              AND v.publish_status = 'published'
            ORDER BY v.revenue_score IS NULL ASC, v.revenue_score DESC, v.created_at DESC
            LIMIT 20
        `);
        
        await conn.end();

        // 2. Load Learning Memory
        let memory = { best_hook_styles: [], best_cta_styles: [], patterns_to_avoid: [] };
        const memPath = path.join(process.cwd(), 'historical_winner_patterns.json');
        if (fs.existsSync(memPath)) {
            try {
                memory = JSON.parse(fs.readFileSync(memPath, 'utf8')).patterns;
            } catch(e) {}
        }

        return NextResponse.json({
            performances: performances,
            memory: memory
        });
    } catch (e) {
        console.error("Intelligence API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
