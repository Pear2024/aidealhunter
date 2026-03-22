import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const categoryQuery = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    connection = await getConnection();
    
    let queryStr = "SELECT * FROM normalized_deals WHERE ";
    let queryArgs = [];
    
    if (status === 'all') {
        queryStr += "status IN ('approved', 'expired')";
    } else {
        queryStr += "status = ?";
        queryArgs.push(status);
    }
    
    if (categoryQuery !== 'all') {
        queryStr += " AND category = ?";
        queryArgs.push(categoryQuery);
    }
    
    queryStr += ` ORDER BY merchandiser_score DESC, created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await connection.execute(queryStr, queryArgs);
    let visitorSegment = null;
    const cookieStore = await cookies();
    const dhVisitorId = cookieStore.get('dh_visitor_id')?.value;
    
    if (dhVisitorId) {
        const [profiles] = await connection.execute(
            "SELECT segment FROM visitor_profiles WHERE visitor_id = ?",
            [dhVisitorId]
        );
        if (profiles.length > 0 && profiles[0].segment !== 'New Visitor') {
            visitorSegment = profiles[0].segment;
        }
    }

    let latestBlogs = [];
    if (page === 1 && status === 'all' && categoryQuery === 'all') {
        const [blogRows] = await connection.execute(
            `SELECT id, slug, title, image_url, created_at FROM ai_blog_posts ORDER BY created_at DESC LIMIT 3`
        );
        latestBlogs = blogRows;
    }

    return NextResponse.json({ deals: rows, visitorSegment, blogs: latestBlogs });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch deals: ' + error.message }, { status: 500 });
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
          const imageURL = rows[0]?.image_url;
          
          // Use our tracking redirect link instead of the original URL
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nadaniadigitalllc.com';
          const trackURL = `${baseUrl}/r/${id}`;
          
          let pct = '';
          if (data.original_price && data.discount_price && data.original_price > data.discount_price) {
            pct = Math.round((1 - data.discount_price / data.original_price) * 100);
          }

          const caption = `🔥 MEGA DEAL! 🔥\n\n${data.title}\n\n💸 NOW ONLY: $${parseFloat(data.discount_price).toFixed(2)} ${data.original_price ? `(Was $${parseFloat(data.original_price).toFixed(2)} - Save ${pct}%!)` : ''}\n✨ Brand: ${data.brand || 'Premium'}\n\n👇 GRAB IT HERE: 👇\n${trackURL}\n\n#InlandEmpire #SmartShopper #HemetDeals`;
          
          let fbEndpoint = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`;
          const fbPayload = {
            message: caption,
            link: trackURL,
            access_token: process.env.FB_PAGE_ACCESS_TOKEN
          };

          if (imageURL) {
            fbEndpoint = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos`;
            fbPayload.url = imageURL;
            fbPayload.caption = caption;
            delete fbPayload.message;
            delete fbPayload.link;
          }

          let currentEndpoint = fbEndpoint;
          let currentPayload = { ...fbPayload };

          let fbResponse = await fetch(currentEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentPayload)
          });
          
          let fbResult = await fbResponse.json();
          console.log('--- FB API RAW RESPONSE (Attempt 1) ---');
          console.log(fbResult);
          
          // Fallback logic: If uploading a photo failed, try posting just the link
          if (fbResult.error && imageURL) {
            console.warn('FB Photo upload failed, falling back to standard link post:', fbResult.error);
            currentEndpoint = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`;
            currentPayload = {
              message: caption,
              link: trackURL,
              access_token: process.env.FB_PAGE_ACCESS_TOKEN
            };
            
            fbResponse = await fetch(currentEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(currentPayload)
            });
            fbResult = await fbResponse.json();
            console.log('--- FB API RAW RESPONSE (Fallback) ---');
            console.log(fbResult);
          }

          if (fbResult.error) {
            console.error('FB Error Object:', fbResult.error);
          } else {
            console.log('Successfully Posted to FB:', fbResult.id);
          }
        } catch (e) {
          console.error('FB API catch block triggered', e);
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
