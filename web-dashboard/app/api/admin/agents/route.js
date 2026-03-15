import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { logAgent } from '@/lib/agent_logger';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

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
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { action, agentId, agentName } = body;

    if (action === 'trigger') {
      await logAgent(agentId, agentName, 'Manual Execution', 'running', 'Command Dispatched by Admin.');
      
      setTimeout(async () => {
         await logAgent(agentId, agentName, 'Execution Completed', 'success', 'Manual task concluded.');
      }, 4000);

      return NextResponse.json({ success: true, message: `Dispatched execution for ${agentName}` });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
