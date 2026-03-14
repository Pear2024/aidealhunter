import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM normalized_deals WHERE status = ? ORDER BY created_at DESC",
      [status]
    );
    return NextResponse.json({ deals: rows });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(request) {
  let connection;
  try {
    const body = await request.json();
    const { id, action, data } = body;
    connection = await getConnection();

    if (action === 'approve') {
      await connection.execute(
        `UPDATE normalized_deals SET 
          title = ?, brand = ?, original_price = ?, discount_price = ?, status = 'approved' 
         WHERE id = ?`,
        [data.title, data.brand, data.original_price, data.discount_price, id]
      );

      // --- FB POSTING LOGIC ---
      if (process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN) {
        try {
          const [rows] = await connection.execute("SELECT url, image_url FROM normalized_deals WHERE id = ?", [id]);
          const dealURL = rows[0]?.url || 'https://hemet-deals.vercel.app';
          const imageURL = rows[0]?.image_url;
          
          let pct = '';
          if (data.original_price && data.discount_price && data.original_price > data.discount_price) {
            pct = Math.round((1 - data.discount_price / data.original_price) * 100);
          }

          const caption = `🔥 MEGA DEAL! 🔥\n\n${data.title}\n\n💸 NOW ONLY: $${parseFloat(data.discount_price).toFixed(2)} ${data.original_price ? `(Was $${parseFloat(data.original_price).toFixed(2)} - Save ${pct}%!)` : ''}\n✨ Brand: ${data.brand || 'Premium'}\n\n👇 GRAB IT HERE: 👇\n${dealURL}\n\n#InlandEmpire #SmartShopper #HemetDeals`;
          
          let fbEndpoint = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`;
          const fbPayload = {
            message: caption,
            link: dealURL,
            access_token: process.env.FB_PAGE_ACCESS_TOKEN
          };

          if (imageURL) {
            fbEndpoint = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos`;
            fbPayload.url = imageURL;
            fbPayload.caption = caption;
            delete fbPayload.message;
            delete fbPayload.link;
          }

          const fbResponse = await fetch(fbEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fbPayload)
          });
          
          const fbResult = await fbResponse.json();
          if (fbResult.error) {
            console.error('FB Error:', fbResult.error);
          } else {
            console.log('Posted to FB:', fbResult.id);
          }
        } catch (e) {
          console.error('FB API call failed', e);
        }
      }

    } else if (action === 'reject') {
      await connection.execute(
        `UPDATE normalized_deals SET status = 'rejected' WHERE id = ?`,
        [id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
