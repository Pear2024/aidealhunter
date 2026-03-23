import { NextResponse } from 'next/server';
import { qaAgent } from '@/lib/agents/qa_agent';

export const maxDuration = 120; // 2 minutes max processing for 5 items

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const secretText = url.searchParams.get('key');
        
        if (secretText !== 'super_secret_ai_cron_password_123') {
            return NextResponse.json({ error: 'Unauthorized Access. Invalid Agent Key.' }, { status: 401 });
        }

        console.log("👮‍♂️ [AGENT 2: QA GATEKEEPER] - Heartbeat Triggered. Initiating Sweep...");

        const qaState = {
            messages: [
                {
                    role: "user",
                    content: "Please fetch a batch of pending deals, thoroughly evaluate each one, and execute your approval or rejection protocols immediately."
                }
            ]
        };

        const qaResult = await qaAgent.invoke(qaState, { recursionLimit: 50 });
        let outputText = qaResult.messages[qaResult.messages.length - 1].content;
        if (typeof outputText !== 'string') {
           outputText = JSON.stringify(outputText); 
        }

        console.log("👮‍♂️ QA Sweep Finished:", outputText);

        return NextResponse.json({
            success: true,
            message: 'QA Gatekeeper has finished evaluating the pending queue.',
            agent_report: outputText
        });
        
    } catch (error) {
        console.error("❌ QA Agent Fatal Exception:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
