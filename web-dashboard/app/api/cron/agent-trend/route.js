import { NextResponse } from 'next/server';
import { trendAgent } from '@/lib/agents/trend_agent';
import { discoveryAgent } from '@/lib/agents/discovery_agent';
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

        console.log("🕵️‍♂️ Waking up Squad 0: Trend Master...");

        // 1. Invoke Trend Agent to get the golden keyword
        const trendState = {
            messages: [
                new HumanMessage("Please find exactly ONE highly specific e-commerce trending product keyword based on today's Google Trends. Follow all rules and output only the product name.")
            ]
        };

        const trendResult = await trendAgent.invoke(trendState);
        let keyword = trendResult.messages[trendResult.messages.length - 1].content;
        
        // Gemini array text fallback
        if (Array.isArray(keyword)) keyword = keyword.map(p => p.text).join(' ');
        
        // Clean up output (remove quotes, newlines, limit length)
        keyword = keyword.replace(/['"\\[\\]]/g, '').trim().substring(0, 50);

        console.log(`🔥 Squad 0 assigned keyword: "${keyword}". Dispatching Squad 1...`);

        // 2. Invoke Discovery Agent using that exactly identical keyword
        const discoveryState = {
            messages: [
                new HumanMessage(`Please find the top deals for the keyword "${keyword}". Parse them, extract correct pricing, and save the best 2 deals to the database using the raw vendor URLs. Ignore duplicate URLs.`)
            ]
        };

        const discoveryResult = await discoveryAgent.invoke(discoveryState);
        let discoveryOutput = discoveryResult.messages[discoveryResult.messages.length - 1].content;
        if (Array.isArray(discoveryOutput)) discoveryOutput = discoveryOutput.map(p => p.text).join(' ');

        console.log("✅ Autonomous Trend-to-Discovery Pipeline Complete!");

        return NextResponse.json({ 
            success: true, 
            trending_keyword: keyword,
            discovery_agent_response: discoveryOutput,
            agent_final_response: `[SQUAD 0 - TREND MASTER] 📡 \nScanned Google Trends US feed and analyzed data.\n🔥 Hot e-commerce keyword chosen: "${keyword}"\n\n------------------------\n\n[SQUAD 1 - DEAL HUNTER] 🚀 \nAgent dispatched to hunt for: "${keyword}"\n\n${discoveryOutput}`
        });

    } catch (error) {
        console.error("Trend Pipeline Fault:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
