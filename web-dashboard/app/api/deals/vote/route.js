import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function POST(request) {
  let connection;
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to vote.' }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || 'unknown@example.com';
    const username = user?.username || user?.firstName || 'Anonymous';

    const { dealId, voteType } = await request.json(); // voteType should be 1 (upvote) or -1 (downvote)

    if (!dealId || ![1, -1].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    connection = await getConnection();

    // 0. Ensure user exists in the local database to satisfy the Foreign Key constraint on votes table
    try {
      await connection.execute(
        `INSERT IGNORE INTO users (id, email, username) VALUES (?, ?, ?)`,
        [userId, email, username]
      );
    } catch (e) {
      console.error("Local User Tracking Error on Vote:", e);
    }

    // 1. Check if the user has already voted on this deal
    const [existingVotes] = await connection.execute(
      `SELECT vote_type FROM votes WHERE user_id = ? AND deal_id = ?`,
      [userId, dealId]
    );

    let scoreDelta = 0;

    if (existingVotes.length > 0) {
      const pastVote = existingVotes[0].vote_type;
      
      if (pastVote === voteType) {
        // User clicked the same vote button again -> Remove their vote
        await connection.execute(`DELETE FROM votes WHERE user_id = ? AND deal_id = ?`, [userId, dealId]);
        scoreDelta = -pastVote; // if past was 1, minus 1. If past was -1, add 1.
      } else {
        // User changed their vote direction
        await connection.execute(
          `UPDATE votes SET vote_type = ? WHERE user_id = ? AND deal_id = ?`,
          [voteType, userId, dealId]
        );
        scoreDelta = voteType * 2; // if past was -1 and new is 1, change is +2. If past was 1 and new is -1, change is -2.
      }
    } else {
      // User is voting for the first time
      await connection.execute(
        `INSERT INTO votes (user_id, deal_id, vote_type) VALUES (?, ?, ?)`,
        [userId, dealId, voteType]
      );
      scoreDelta = voteType;
    }

    // 2. Update the master deal score cache
    if (scoreDelta !== 0) {
      await connection.execute(
        `UPDATE normalized_deals SET vote_score = vote_score + ? WHERE id = ?`,
        [scoreDelta, dealId]
      );
    }

    // 3. Return the new updated score to the frontend
    const [updatedDeal] = await connection.execute(
      `SELECT vote_score FROM normalized_deals WHERE id = ?`,
      [dealId]
    );

    return NextResponse.json({ success: true, newScore: updatedDeal[0].vote_score });

  } catch (error) {
    console.error('Vote API Error:', error);
    return NextResponse.json({ error: 'Internal server error processing vote' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
