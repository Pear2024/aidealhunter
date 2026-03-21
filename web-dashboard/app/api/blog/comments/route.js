import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT id, user_name, comment_text, created_at FROM blog_comments WHERE post_id = ? ORDER BY created_at ASC',
            [postId]
        );
        return NextResponse.json({ comments: rows });
    } catch (e) {
        console.error("Comments API GET Error:", e);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end() } catch(e){}
        }
    }
}

export async function POST(request) {
    let connection;
    try {
        const body = await request.json();
        const { postId, userName, userId, commentText } = body;

        if (!postId || !userName || !commentText) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        connection = await getConnection();
        const [result] = await connection.execute(
            'INSERT INTO blog_comments (post_id, user_name, user_id, comment_text) VALUES (?, ?, ?, ?)',
            [postId, userName, userId || null, commentText]
        );

        return NextResponse.json({ success: true, commentId: result.insertId });
    } catch (e) {
        console.error("Comments API POST Error:", e);
        return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end() } catch(e){}
        }
    }
}
