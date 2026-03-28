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

        const trendingNiches = [
            "Three International Supplements",
            "Three International Vitalite",
            "Three International Imune",
            "Three International Eternel",
            "Three International Revive",
            "Three International Purifi",
            "Three International Collagene"
        ];
        
        // Randomly select an e-commerce proven keyword if none is passed
        const keyword = searchParams.get('keyword') || trendingNiches[Math.floor(Math.random() * trendingNiches.length)];
        console.log(`🚀 Dispatching Discovery Agent for Amazon hits keyword: ${keyword}...`);
        
        const initialState = {
            messages: [
                new HumanMessage(`Please search Amazon for current hits and discounted deals related to "${keyword}". Parse the results, extract the correct pricing/discounts, and save the absolute best 2 ranking deals to the database using the raw vendor URLs. Ignore duplicate URLs.`)
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
