import { NextResponse } from 'next/server';
import { communityAgent } from '@/lib/agents/community_agent';
import { HumanMessage } from '@langchain/core/messages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        if (key !== 'super_secret_ai_cron_password_123') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("🚀 Waking up Squad 4: Community Engagement...");

        const initialState = {
            messages: [
                new HumanMessage("Wake up! Please scan our Facebook page using your tools to see if there are any unanswered user comments. Reply to them charismatically to close the sale. Once you're done replying (or if there are no comments), please generate and publish a fresh organic post to keep our followers engaged!")
            ],
        };

        const result = await communityAgent.invoke(initialState);
        
        console.log("✅ Community Agent finished its mission.");

        let finalResponse = result.messages[result.messages.length - 1].content;
        
        if (Array.isArray(finalResponse)) {
            finalResponse = finalResponse.map(part => part.text || '').join('');
        }

        return NextResponse.json({ 
            success: true, 
            agent_final_response: finalResponse 
        });

    } catch (error) {
        console.error("Agent 4 (Community) Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
