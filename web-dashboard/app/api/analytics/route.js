import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let connection;
  try {
    connection = await getConnection();
    
    // Total approved deals (from DB)
    const [approvedRows] = await connection.execute("SELECT COUNT(*) as total FROM normalized_deals WHERE status = 'approved'");
    const totalApproved = approvedRows[0].total;

    let finalTopDeals = [];
    let trueTotalClicks = 0;
    
    // Attempt Bitly Telemetry
    if (process.env.BITLY_ACCESS_TOKEN) {
         try {
             const headers = { 'Authorization': `Bearer ${process.env.BITLY_ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
             // Get User Default Group
             const uRes = await fetch('https://api-ssl.bitly.com/v4/user', { headers });
             if (uRes.ok) {
                 const uData = await uRes.json();
                 const guid = uData.default_group_guid;
                 // Get latest 50 links
                 const lRes = await fetch(`https://api-ssl.bitly.com/v4/groups/${guid}/bitlinks?size=50`, { headers });
                 if (lRes.ok) {
                     const lData = await lRes.json();
                     const links = lData.links || [];
                     
                     // Get click summaries for latest 10
                     let metrics = [];
                     for (let i = 0; i < Math.min(links.length, 10); i++) {
                         const lk = links[i];
                         try {
                             const cRes = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${lk.id}/clicks/summary?unit=month&units=-1`, { headers });
                             const cData = await cRes.json();
                             // Only track Amazon-specific links for Deal Hunter metrics
                             if (lk.long_url && (lk.long_url.includes('amazon') || lk.long_url.includes('amzn.to'))) {
                                 const clicks = cData.total_clicks || 0;
                                 trueTotalClicks += clicks;
                                 
                                 metrics.push({
                                     id: lk.id,
                                     title: lk.title || "Amazon Generated Shortlink",
                                     brand: "Amazon Affiliate",
                                     url: lk.long_url,
                                     clicks: clicks,
                                     earned_revenue: (clicks * 0.03 * 30 * 0.04).toFixed(2) // Predictive 3% Conversion * $30 Avg * 4% Commission
                                 });
                             }
                         } catch(e) {}
                     }
                     // Sort by highest clicks
                     finalTopDeals = metrics.sort((a,b) => b.clicks - a.clicks);
                 }
             }
         } catch(err) { console.error("Bitly Metrics Error:", err); }
    }
    
    // Fallback Mock DB Data if Bitly failed or no token
    if (finalTopDeals.length === 0) {
        const [topDeals] = await connection.execute("SELECT id, title, brand, clicks, earned_revenue, url FROM normalized_deals WHERE status = 'approved' ORDER BY clicks DESC LIMIT 10");
        finalTopDeals = topDeals;
        const [statsRows] = await connection.execute("SELECT SUM(clicks) as total_clicks FROM normalized_deals WHERE status = 'approved'");
        trueTotalClicks = statsRows[0].total_clicks || 0;
    }

    const calculatedRevenue = (trueTotalClicks * 0.03 * 30 * 0.04).toFixed(2);

    return NextResponse.json({
      totalApproved,
      totalClicks: trueTotalClicks,
      totalRevenue: calculatedRevenue,
      topDeals: finalTopDeals
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
