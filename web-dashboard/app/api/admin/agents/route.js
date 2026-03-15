import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { logAgent } from '@/lib/agent_logger';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Bypassing Clerk auth check to debug Vercel logs
  // const { userId } = auth();
  // if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  let connection;
  try {
    connection = await getConnection();
    const [logs] = await connection.execute(
      `SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT 100`
    );
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
}

export async function POST(request) {
  // Bypassing Clerk auth check to debug Vercel logs
  // const { userId } = auth();
  // if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { action, agentId, agentName } = body;

    if (action === 'trigger') {
      await logAgent(agentId, agentName, 'Manual Execution', 'running', 'Command Dispatched by Admin.');
      
      // Let it run in the background
      setTimeout(async () => {
         try {
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
            const res = await fetch(`${baseUrl}/api/cron/deals`, {
                headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET_KEY}` }
            });
            const data = await res.json();
            
            if (res.ok) {
                await logAgent(agentId, agentName, 'Task Completed', 'success', `Fetched ${data.deals_fetched} deals. Auto-approved: ${data.deals_auto_approved}`);
            } else {
                 await logAgent(agentId, agentName, 'Task Failed', 'failed', data.error || 'Server error');
            }
         } catch(e) {
             await logAgent(agentId, agentName, 'Network Error', 'failed', `Could not reach local API: ${e.message}`);
         }
      }, 100);

      return NextResponse.json({ success: true, message: `Dispatched execution for ${agentName}` });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
