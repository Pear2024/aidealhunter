import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  let connection;
  try {
    const { id } = params;

    connection = await getConnection();
    
    // First, lookup the URL and Brand for the given deal ID
    const [rows] = await connection.execute(
      "SELECT url, brand FROM normalized_deals WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      // Deal not found, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }

    let targetUrl = rows[0].url;

    // --- AFFILIATE LINK INJECTION ---
    const amazonTag = process.env.AMAZON_AFFILIATE_TAG;
    if (amazonTag && targetUrl.includes('amazon.com')) {
      try {
        const urlObj = new URL(targetUrl);
        urlObj.searchParams.set('tag', amazonTag); // Appends ?tag=YOUR_TAG
        targetUrl = urlObj.toString();
      } catch (e) {
        console.error('Failed to parse URL for affiliate tag', e);
      }
    }

    // Increment the click counter
    await connection.execute(
      "UPDATE normalized_deals SET clicks = clicks + 1 WHERE id = ?",
      [id]
    );

    // --- PHASE 20: Agent 10 (Taste Profiler) ---
    const cookieStore = cookies();
    let dhVisitorId = cookieStore.get('dh_visitor_id')?.value;
    let isNewVisitor = false;

    if (!dhVisitorId) {
        dhVisitorId = crypto.randomUUID();
        isNewVisitor = true;
        // Register new profile
        await connection.execute(
            "INSERT IGNORE INTO visitor_profiles (visitor_id, segment) VALUES (?, 'New Visitor')",
            [dhVisitorId]
        );
    }

    // Record the specific click
    await connection.execute(
        "INSERT INTO visitor_clicks (visitor_id, deal_id) VALUES (?, ?)",
        [dhVisitorId, id]
    );

    // Redirect the user to the actual product page and plant the tracking cookie
    const response = NextResponse.redirect(targetUrl);
    
    // Plant the Taste Profiler cookie (Expires in 1 year)
    if (isNewVisitor) {
        response.cookies.set('dh_visitor_id', dhVisitorId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }
    
    // Plant the brand in the cookie (Expires in 30 days)
    if (rows[0].brand && rows[0].brand !== 'Unknown') {
        response.cookies.set('preferred_brand', rows[0].brand, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    }

    return response;

  } catch (error) {
    console.error('Redirect Error:', error);
    // If something goes wrong, redirect to home so the user isn't stuck
    return NextResponse.redirect(new URL('/', request.url));
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
