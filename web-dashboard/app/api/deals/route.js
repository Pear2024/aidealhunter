import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET() {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM normalized_deals WHERE status = 'pending' ORDER BY created_at DESC"
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
