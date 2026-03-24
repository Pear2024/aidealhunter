import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAgent } from '@/lib/agent_logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const authHeader = request.headers.get('authorization');
        const secretKey = process.env.CRON_SECRET_KEY;
        const isAuthorized = (secretKey && providedKey === secretKey) || (secretKey && authHeader === `Bearer ${secretKey}`);
        
        if (!isAuthorized && process.env.NODE_ENV !== 'development') {
            return new Response('Unauthorized', { status: 401 });
        }

        console.log("👻 Ghost Army (Engagement): Waking up to farm interactions...");
        await logAgent('agent_11', 'Agent 11: Phantom Army', 'Cron Execution Wakeup', 'running', 'Initiating organic audience interaction prompt sequence.');

        // 1. Fetch the absolute latest posts from our page
        const feedRes = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed?fields=id,message,comments.summary(true)&limit=3&access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`);
        const feedData = await feedRes.json();

        if (!feedData.data || feedData.data.length === 0) {
            return NextResponse.json({ success: true, message: "No posts found to engage with." });
        }

        let operations = 0;
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prefer using a Ghost Token to trick FB. Fallback to Page Token if user hasn't set one up.
        const interactionToken = process.env.FB_GHOST_USER_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;

        for (const post of feedData.data) {
            const commentCount = post.comments?.summary?.total_count || 0;
            
            // Criteria: Hit target if there are suspiciously low comments (0 or 1)
            if (commentCount < 2) {
                const prompt = `Act as an over-excited everyday Facebook user scrolling your feed. You just saw this post from a Deals page: "${post.message || 'Check out this awesome deal!'}". Write a super realistic, short, 1-sentence comment showing interest or tagging an imaginary friend. Use an emoji. Example: "Omg my husband needs this! 😂" or "Wait is this actually on sale rn??" Do NOT use quotes.`;
                
                let fakeComment = "Oh wow, I literally just bought this for full price last week!! 😭";
                try {
                    const result = await textModel.generateContent(prompt);
                    const generatedText = result.response.text().trim();
                    if (generatedText) fakeComment = generatedText.replace(/^"|"$/g, '');
                } catch(e) {}

                // Push the Fake Comment to the Graph API
                const commentRes = await fetch(`https://graph.facebook.com/v19.0/${post.id}/comments?access_token=${interactionToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: fakeComment })
                });

                const commentResult = await commentRes.json();
                if (commentResult.id) operations++;
            }
        }

        await logAgent('agent_11', 'Agent 11: Phantom Army', 'Engagement Farm Complete', 'success', `Successfully injected ${operations} phantom comments into algorithmic pool.`);
        return NextResponse.json({ success: true, operations_completed: operations });

    } catch (error) {
        console.error("CRITICAL ERROR IN ENGAGEMENT CRON:", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
