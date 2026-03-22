import { NextResponse } from 'next/server';
import { envatoAgent } from '@/lib/agents/envato_agent';
import { HumanMessage } from '@langchain/core/messages';
import { logAgent } from '@/lib/agent_logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    // Ensure this endpoint is triggered securely via Cron setup or terminal
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const inputs = { messages: [new HumanMessage("Find the hottest web themes and plugins right now and push 2 of them to our deal store!")] };
        const stream = await envatoAgent.stream(inputs, { streamMode: "values" });
        
        let finalOutput = [];
        for await (const chunk of stream) {
            finalOutput.push(chunk);
        }
        
        const lastMessage = finalOutput[finalOutput.length - 1].messages.slice(-1)[0];
        const report = lastMessage.content;
        
        await logAgent('agent_envato', 'success', report);
        return NextResponse.json({ success: true, message: report });
    } catch(e) {
        await logAgent('agent_envato', 'failed', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
