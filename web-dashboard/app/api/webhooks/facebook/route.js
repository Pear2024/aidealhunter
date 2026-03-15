import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generativeai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Facebook Webhook Verification
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN || 'my_super_secret_verify_token';

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('FB Webhook Verified!');
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }
    return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Ensure this is an event from a page subscription
        if (body.object !== 'page') {
            return new NextResponse('Not a page event', { status: 404 });
        }

        let connection;
        
        for (const entry of body.entry) {
            const changes = entry.changes;
            if (!changes) continue;

            for (const change of changes) {
                // We only care about feed comments (new additions)
                if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
                    const comment = change.value;
                    const postId = comment.post_id;
                    const commentId = comment.comment_id;
                    const message = comment.message;
                    const senderId = comment.from?.id;

                    // Ignore comments made by the Page itself to prevent infinite AI loops
                    if (senderId === process.env.FB_PAGE_ID) continue;

                    console.log(`💬 Agent 8 Received Comment on Post [${postId}]: "${message}"`);

                    if (!connection) connection = await getConnection();

                    // 1. Match the Facebook Post ID to a Deal in our database
                    const [dealRows] = await connection.execute(
                        "SELECT id, title, discount_price, status FROM normalized_deals WHERE fb_post_id = ?",
                        [postId]
                    );

                    if (dealRows.length > 0) {
                        const deal = dealRows[0];
                        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hemet-deals.vercel.app';
                        const trackURL = `${baseUrl}/r/${deal.id}`;
                        
                        // 2. The Comment Closer (Agent 8) Prompt
                        const closerPrompt = `
                        You are "The Comment Closer", an elite AI customer service agent for an e-commerce affiliate page.
                        A customer just commented on our Facebook post for the following product:
                        
                        Product: ${deal.title}
                        Price: $${parseFloat(deal.discount_price).toFixed(2)}
                        Deal Status: ${deal.status.toUpperCase()} (Approved means available to buy. Expired/Hidden means sold out/unavailable).
                        Affiliate Link: ${trackURL}
                        Home Page (for alternatives): ${baseUrl}

                        Customer's Comment: "${message}"

                        YOUR TASK:
                        Reply to the customer's comment in Thai. Be extremely polite, helpful, and natural (use emojis).
                        - If the deal status is APPROVED: Give them the Affiliate Link to buy it immediately. Use scarcity/FOMO if appropriate.
                        - If the deal status is EXPIRED or HIDDEN: Apologize and tell them the deal ended, then give them the Home Page link to look for alternatives.
                        - Do NOT sound like a robot. Keep it short (1-3 sentences maximum).
                        - Always include the relevant link.

                        Output ONLY the raw reply text.
                        `;

                        const aiResult = await model.generateContent(closerPrompt);
                        const replyMessage = aiResult.response.text().trim();

                        // 3. Post the reply back to Facebook using Graph API
                        console.log(`🤖 Agent 8 Replying: "${replyMessage}"`);
                        
                        const fbUrl = \`https://graph.facebook.com/v19.0/\${commentId}/comments\`;
                        const fbResponse = await fetch(fbUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: replyMessage,
                                access_token: process.env.FB_PAGE_ACCESS_TOKEN
                            })
                        });

                        const fbResult = await fbResponse.json();
                        if (fbResult.error) {
                            console.error('Agent 8 Graph API Error:', fbResult.error);
                        } else {
                            console.log('✅ Agent 8 Successfully Closed the Comment:', fbResult.id);
                        }
                    } else {
                        console.log(`Agent 8 Debug: Could not find deal mapping for post_id ${postId}`);
                    }
                }
            }
        }

        if (connection) await connection.end();
        return new NextResponse('EVENT_RECEIVED', { status: 200 });

    } catch (error) {
        console.error('Agent 8 Webhook Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
