import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const conn = await getConnection();
        await conn.execute("UPDATE normalized_deals SET status = 'approved', merchandiser_score = 99 WHERE id = 709");
        await conn.end();
        return NextResponse.json({ success: true, message: "Deal 709 Approved!" });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
