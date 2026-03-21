import { NextResponse } from 'next/server';
import { newsAgent } from '@/lib/news_agent';
import { HumanMessage } from '@langchain/core/messages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max Vercel hobby duration for edge/serverless

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const secretKey = process.env.CRON_SECRET_KEY;
        
        if (secretKey && providedKey !== secretKey && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("🚀 Initializing Agentic AI News Workflow...");
        
        // Invoke the LangGraph Agent
        const initialState = {
            messages: [
                new HumanMessage("Please find the latest AI news, filter duplicates, format into a Thai Telegram message, send it, and mark them as read in the database. Go!")
            ]
        };

        const result = await newsAgent.invoke(initialState);
        
        console.log("✅ Agent finished its workflow.");

        // result.messages contains the history of Agent steps (thoughts, tool calls, final response)
        const finalResponse = result.messages[result.messages.length - 1].content;

        return NextResponse.json({ 
            success: true, 
            message: "Agent ran successfully",
            agent_final_response: finalResponse
        });

    } catch (error) {
        console.error("Agentic AI News Intelligence Fault:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
