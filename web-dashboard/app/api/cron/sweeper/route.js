import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { verifyAmazonIntegrity } from '@/lib/verifier';
import { logAgent } from '@/lib/agent_logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(request) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const authHeader = request.headers.get('authorization');
        const secretKey = process.env.CRON_SECRET_KEY;
        const isAuthorized = (secretKey && providedKey === secretKey) || (secretKey && authHeader === `Bearer ${secretKey}`);
        
        if (!isAuthorized && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("🧹 Agent 7 (Sweeper): Waking up to purge dead deals...");
        await logAgent('agent_7', 'Agent 7: The Sweeper', 'Cron Execution Wakeup', 'running', 'Initiating background integrity sweep and Stale Lock recovery.');

        connection = await getConnection();

        // 🚨 1. STALE LOCK REAPER (Crash Recovery & Retry Strategy) 🚨
        // Target: Deals successfully locked by a worker (processing) but whose process 
        // crashed (OOM / Timeout > 60s) before reaching the finish line.
        const [reaperResult] = await connection.execute(
             `UPDATE normalized_deals 
              SET fb_status = IF(fb_status = 'processing', 'failed', fb_status), 
                  blog_status = IF(blog_status = 'processing', 'failed', blog_status), 
                  locked_at = NULL 
              WHERE locked_at < NOW() - INTERVAL 10 MINUTE 
              AND (fb_status = 'processing' OR blog_status = 'processing')`
        );
        
        if (reaperResult.affectedRows > 0) {
             console.log(`💀 Reaper Process cleaned up ${reaperResult.affectedRows} Stale/Zombie Locks! (Process Crash Recovered)`);
             await logAgent('agent_7', 'Agent 7: The Sweeper', 'Stale Lock Cleanup', 'success', `Un-locked \${reaperResult.affectedRows} zombie deals for retry queue.`);
        }

        // 2. Regular Pending Sweeper
        // Grab pending amazon deals. Limit to 15 per run to prevent Edge timeout (60s).
        const [deals] = await connection.execute(
            `SELECT id, title, url, discount_price FROM normalized_deals WHERE status = 'pending' AND (url LIKE '%amazon.com%' OR url LIKE '%amzn.to%') LIMIT 15`
        );

        if (deals.length === 0) {
            await logAgent('agent_7', 'Agent 7: The Sweeper', 'Sweep Completed', 'success', 'No pending deals require verification.');
            return NextResponse.json({ success: true, message: "No pending deals to check." });
        }

        let checkedCount = 0;
        let rejectedCount = 0;

        for (const deal of deals) {
            checkedCount++;
            try {
                 const verify = await verifyAmazonIntegrity(deal.url, deal.discount_price);
                 
                 // If the scrape succeeded but the price clearly mismatches or product is dead
                 if (verify.success && verify.livePrice !== 'Unknown' && !verify.priceMatch) {
                     console.log(`❌ Sweeper Purged: ${deal.title} (Expected: ${deal.discount_price}, Live: ${verify.livePrice})`);
                     await connection.execute("UPDATE normalized_deals SET status = 'rejected' WHERE id = ?", [deal.id]);
                     rejectedCount++;
                 }
            } catch(e) {
                 console.error(`Sweeper Error on ${deal.id}:`, e);
            }
        }

        await logAgent('agent_7', 'Agent 7: The Sweeper', 'Sweep Completed', 'success', `Swept ${checkedCount} items. Purged ${rejectedCount} dead deals from the queue.`);
        return NextResponse.json({ success: true, checked: checkedCount, purged: rejectedCount });

    } catch (error) {
        console.error("CRITICAL ERROR IN SWEEPER CRON:", error);
        return new Response('Internal Server Error', { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e) {}
        }
    }
}
