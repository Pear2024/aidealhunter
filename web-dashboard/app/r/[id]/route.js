import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  let connection;
  try {
    const { id } = params;

    connection = await getConnection();
    
    // First, lookup the URL for the given deal ID
    const [rows] = await connection.execute(
      "SELECT url FROM normalized_deals WHERE id = ?",
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

    // Redirect the user to the actual product page
    return NextResponse.redirect(targetUrl);

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
