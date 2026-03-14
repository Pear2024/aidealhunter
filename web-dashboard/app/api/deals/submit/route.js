import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(request) {
  let connection;
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, url, brand, original_price, discount_price, user } = body;

    if (!title || !url || !discount_price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    connection = await getConnection();

    // 1. Ensure the user exists in our local `users` table
    try {
      await connection.execute(
        `INSERT IGNORE INTO users (id, email, username) VALUES (?, ?, ?)`,
        [user.id, user.email || 'unknown@example.com', user.username || 'Anonymous']
      );
    } catch (e) {
      console.error("User Insert Error:", e);
    }

    // 2. We don't have an image natively from manual submit yet, but we will mark it pending
    // A future upgrade could run the URL through Gemini to fetch an image, like Phase 1!
    try {
      await connection.execute(
        `INSERT INTO normalized_deals (
            title, brand, original_price, discount_price, 
            url, status, submitter_id, vote_score
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, 0)`,
        [
          title,
          brand || 'Unknown',
          original_price || null,
          discount_price,
          url,
          user.id
        ]
      );
      
      return NextResponse.json({ success: true });
    } catch (e) {
      console.error("Deal Insert Error:", e);
      return NextResponse.json({ error: 'Failed to insert deal into database.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Submit API Error:', error);
    return NextResponse.json({ error: 'Internal server error while submitting deal' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
