import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute('TRUNCATE TABLE agent_logs');
        return NextResponse.json({ success: true, message: "Agent logs cleared!" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e){}
        }
    }
}
