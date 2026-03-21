import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    let connection;
    try {
        connection = await getConnection();
        
        const [blogs] = await connection.execute('SELECT id, title, image_url, source_deal_id FROM ai_blog_posts');
        const [deals] = await connection.execute("SELECT id, title, status FROM normalized_deals WHERE status = 'approved'");
        const [freshDeals] = await connection.execute("SELECT id FROM normalized_deals WHERE status = 'approved' AND id NOT IN (SELECT source_deal_id FROM ai_blog_posts WHERE source_deal_id IS NOT NULL)");
        
        return NextResponse.json({
            blogs_count: blogs.length,
            blogs: blogs,
            approved_deals_count: deals.length,
            fresh_unblogged_deals_count: freshDeals.length
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e){}
        }
    }
}
