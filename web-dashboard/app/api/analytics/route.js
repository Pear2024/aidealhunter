import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let connection;
  try {
    connection = await getConnection();
    
    // Total approved deals
    const [approvedRows] = await connection.execute("SELECT COUNT(*) as total FROM normalized_deals WHERE status = 'approved'");
    const totalApproved = approvedRows[0].total;

    // Total clicks and revenue
    const [statsRows] = await connection.execute("SELECT SUM(clicks) as total_clicks, SUM(earned_revenue) as total_revenue FROM normalized_deals WHERE status = 'approved'");
    const totalClicks = statsRows[0].total_clicks || 0;
    const totalRevenue = statsRows[0].total_revenue || 0;

    // Top 10 Deals by clicks
    const [topDeals] = await connection.execute("SELECT id, title, brand, clicks, earned_revenue, url FROM normalized_deals WHERE status = 'approved' ORDER BY clicks DESC LIMIT 10");

    return NextResponse.json({
      totalApproved,
      totalClicks,
      totalRevenue,
      topDeals
    });
  } catch (error) {
    console.error('Analytics DB Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(request) {
  // Update revenue for a specific deal
  let connection;
  try {
    const { id, revenue } = await request.json();
    connection = await getConnection();
    
    await connection.execute(
      "UPDATE normalized_deals SET earned_revenue = ? WHERE id = ?",
      [revenue, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Revenue Error:', error);
    return NextResponse.json({ error: 'Failed to update revenue' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
