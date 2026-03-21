import { NextResponse } from 'next/server';
import { discoveryAgent } from '@/lib/agents/discovery_agent';
import { HumanMessage } from '@langchain/core/messages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max Vercel hobby duration

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const secretKey = process.env.CRON_SECRET_KEY;
        
        if (secretKey && providedKey !== secretKey && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const keyword = searchParams.get('keyword') || 'laptop';
        console.log(`🚀 Dispatching Discovery Agent for keyword: ${keyword}...`);
        
        const initialState = {
            messages: [
                new HumanMessage(`Please find the top deals for the keyword "${keyword}". Parse them, extract correct pricing, and save the best 2 deals to the database using the raw vendor URLs. Ignore duplicate URLs.`)
            ]
        };

        const result = await discoveryAgent.invoke(initialState);
        
        console.log("✅ Discovery Agent finished its mission.");

        const finalResponse = result.messages[result.messages.length - 1].content;

        return NextResponse.json({ 
            success: true, 
            message: "Discovery Agent ran successfully",
            agent_final_response: finalResponse
        });

    } catch (error) {
        console.error("Discovery Agent Fault:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
