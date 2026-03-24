import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    let connection;
    try {
        connection = await getConnection();

        // 1. Awaiting Validation (pending deals)
        const [pending] = await connection.execute(
            `SELECT id, title, brand, category, url, status, created_at FROM normalized_deals WHERE status = 'pending' ORDER BY created_at DESC`
        );

        // 2. Queued for Copywriter (approved deals without blog posts)
        const [queued] = await connection.execute(
            `SELECT d.id, d.title, d.brand, d.category, d.url, d.status, d.fb_status, d.blog_status, d.created_at 
             FROM normalized_deals d 
             WHERE d.status = 'approved' AND d.blog_status != 'published'
             ORDER BY d.created_at ASC`
        );

        // 3. Recently Published (deals that have blogs)
        const [published] = await connection.execute(
            `SELECT d.id, b.title as blog_title, d.title, d.category, d.url, d.fb_status, d.blog_status, b.created_at as published_at 
             FROM normalized_deals d 
             JOIN ai_blog_posts b ON d.id = b.source_deal_id 
             ORDER BY b.created_at DESC LIMIT 20`
        );

        return NextResponse.json({ 
            pending, 
            queued, 
            published 
        });

    } catch (error) {
        console.error('Queue API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch queue data.' }, { status: 500 });
    } finally {
        if (connection) await connection.end();
    }
}
