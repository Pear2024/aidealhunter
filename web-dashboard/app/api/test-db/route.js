import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const conn = await getConnection();
        await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
        await conn.execute('TRUNCATE TABLE ai_blog_posts');
        await conn.execute('TRUNCATE TABLE normalized_deals');
        try { await conn.execute('TRUNCATE TABLE deals'); } catch(e) {}
        try { await conn.execute('TRUNCATE TABLE raw_deals'); } catch(e) {}
        await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
        await conn.end();
        return NextResponse.json({ success: true, message: "DB Wiped successfully!" });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
