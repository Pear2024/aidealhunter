import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT title, image_url FROM ai_blog_posts ORDER BY id DESC LIMIT 2');
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e){}
        }
    }
}
