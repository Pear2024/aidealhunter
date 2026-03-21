import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const conn = await getConnection();
        
        // Let's insert a guaranteed fresh deal that has an awesome lifestyle appeal!
        const fakeTitle = "Dyson Airwrap Multi-Styler Complete Long (Ceramic Pop)";
        
        const [res] = await conn.execute(
            `INSERT INTO normalized_deals (title, brand, original_price, discount_price, url, status, merchandiser_score, created_at) VALUES (?, ?, ?, ?, ?, 'approved', 99, NOW())`,
            [fakeTitle, 'Dyson', 599.99, 499.00, 'https://amazon.com/dp/B0CDFGF']
        );
        
        await conn.end();
        return NextResponse.json({ success: true, message: `Inserted fake deal ${res.insertId} as approved!` });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
