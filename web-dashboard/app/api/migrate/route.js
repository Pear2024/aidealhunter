import { NextResponse } from 'next/server';
import { getConnection } from '../../../lib/db';

export async function GET() {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute("ALTER TABLE normalized_deals ADD COLUMN category VARCHAR(50) DEFAULT 'general'");
        return NextResponse.json({ success: true, message: "Migration OK" });
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') return NextResponse.json({ success: true, message: "Already migrated." });
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.end();
    }
}
