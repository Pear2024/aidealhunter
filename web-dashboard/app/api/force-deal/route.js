import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute("DELETE FROM ai_blog_posts WHERE image_url LIKE '%pollinations%'");
        return NextResponse.json({ success: true, message: "Broken posts deleted!" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e){}
        }
    }
}
