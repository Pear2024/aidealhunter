import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let connection;
  try {
    connection = await getConnection();
    
    // Get deals published today
    let dealsToday = 0;
    try {
        const [r1] = await connection.execute("SELECT COUNT(*) as c FROM normalized_deals WHERE status = 'published' AND DATE(updated_at) = CURDATE()");
        dealsToday = r1[0].c;
    } catch(e) {
        // Fallback if updated_at doesn't exist
        const [r1] = await connection.execute("SELECT COUNT(*) as c FROM normalized_deals WHERE status = 'published' AND DATE(created_at) = CURDATE()");
        dealsToday = r1[0].c;
    }

    // Get blogs published today
    let blogsToday = 0;
    try {
        const [r2] = await connection.execute("SELECT COUNT(*) as c FROM ai_blog_posts WHERE DATE(created_at) = CURDATE()");
        blogsToday = r2[0].c;
    } catch(e) {}
    
    return NextResponse.json({ dealsToday, blogsToday });
  } catch (error) {
    console.error('Stats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
}
