import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET(request) {
  let connection;
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    connection = await getConnection();

    // 1. Fetch user's submitted deals (both approved and pending)
    const [deals] = await connection.execute(
      `SELECT * FROM normalized_deals WHERE submitter_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // 2. Calculate user's total reputation (sum of all vote_scores on their deals)
    const [reputationResult] = await connection.execute(
      `SELECT SUM(vote_score) as total_reputation FROM normalized_deals WHERE submitter_id = ?`,
      [userId]
    );

    const totalReputation = reputationResult[0]?.total_reputation || 0;

    return NextResponse.json({ 
        success: true, 
        deals, 
        totalReputation,
        stats: {
            approved_count: deals.filter(d => d.status === 'approved').length,
            pending_count: deals.filter(d => d.status === 'pending').length,
            rejected_count: deals.filter(d => d.status === 'rejected').length
        }
    });

  } catch (error) {
    console.error('Profile API Error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching profile' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
