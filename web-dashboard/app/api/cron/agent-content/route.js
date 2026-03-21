import { NextResponse } from 'next/server';
import { contentAgent } from '@/lib/agents/content_agent';
import { HumanMessage } from '@langchain/core/messages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const secretKey = process.env.CRON_SECRET_KEY;
        
        if (secretKey && providedKey !== secretKey && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`📝 Dispatching Content Generation Squad...`);
        
        const initialState = {
            messages: [
                new HumanMessage(`Please fetch 1 pending approved deal. Write a 400+ word SEO blog post detailing its amazing features, and draft a viral Facebook caption promoting the deal. Be incredibly charismatic and convincing. Publish both to the database and Facebook! If there are no approved deals, just announce that your mission was aborted due to lack of deals.`)
            ]
        };

        const result = await contentAgent.invoke(initialState);
        
        console.log("✅ Content Agent finished its mission.");

        let finalResponse = result.messages[result.messages.length - 1].content;
        
        // Gemini often returns an array of multimodal text parts instead of a single string
        if (Array.isArray(finalResponse)) {
            finalResponse = finalResponse.map(part => part.text || '').join('');
        }

        return NextResponse.json({ 
            success: true, 
            message: "Content Agent ran successfully",
            agent_final_response: finalResponse
        });

    } catch (error) {
        console.error("Content Agent Fault:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
