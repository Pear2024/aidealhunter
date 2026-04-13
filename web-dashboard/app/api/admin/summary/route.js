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

        // 1. Posted Today
        const [postedToday] = await conn.execute(`SELECT COUNT(*) as cnt FROM health_reels_queue WHERE status IN ('posted', 'posted_no_comment') AND DATE(posted_at) = CURDATE()`);
        
        // 2. Safe Template (Fallback) Today
        const [safeToday] = await conn.execute(`SELECT COUNT(*) as cnt FROM health_reels_queue WHERE status = 'safe_template' AND DATE(created_at) = CURDATE()`);

        // 3. Skipped Today
        const [skippedToday] = await conn.execute(`SELECT COUNT(*) as cnt FROM health_reels_queue WHERE status LIKE 'skipped%' AND DATE(created_at) = CURDATE()`);
        
        // 4. Optimization Pending
        const [optPending] = await conn.execute(`SELECT COUNT(*) as cnt FROM reel_optimization_jobs WHERE optimizer_status = 'pending'`);
        
        // 5. Winners
        const [winners] = await conn.execute(`SELECT COUNT(*) as cnt FROM reel_content_versions WHERE is_winner = 1`);
        
        // 6. Should Boost
        const [shouldBoost] = await conn.execute(`SELECT COUNT(*) as cnt FROM reel_content_versions WHERE review_status = 'BOOST'`);
        
        // 7. Ads Boosted
        const [adsBoosted] = await conn.execute(`SELECT COUNT(*) as cnt FROM reel_promotion_jobs WHERE boost_status = 'boosted'`);

        // 8. Errors/Warnings (Status Failed)
        const [errors] = await conn.execute(`SELECT COUNT(*) as cnt FROM health_reels_queue WHERE status = 'failed' AND DATE(created_at) = CURDATE()`);

        await conn.end();

        return NextResponse.json({
            posted_today: postedToday[0].cnt,
            safe_today: safeToday[0].cnt,
            skipped_today: skippedToday[0].cnt,
            optimization_pending: optPending[0].cnt,
            total_winners: winners[0].cnt,
            should_boost: shouldBoost[0].cnt,
            ads_boosted: adsBoosted[0].cnt,
            errors_today: errors[0].cnt
        });
    } catch (e) {
        console.error("Summary API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
