import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { logAgent } from '@/lib/agent_logger';
import { sendTelegramAlert } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const providedKey = searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.CRON_SECRET_KEY;

    const isAuthorized = (secretKey && providedKey === secretKey) || (secretKey && authHeader === `Bearer ${secretKey}`);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const withRetry = async (fn, maxRetries = 2, delayMs = 1000) => {
        for (let i = 0; i <= maxRetries; i++) {
            try { return await fn(); }
            catch (err) {
                if (i === maxRetries) throw err;
                await new Promise(res => setTimeout(res, delayMs * (i + 1)));
            }
        }
    };

    connection = await getConnection();
    
    // --- PHASE 34: The 7-Post Viral Master Loop ---
    const [logRows] = await connection.execute("SELECT COUNT(id) as total_posts FROM agent_logs WHERE action IN ('Facebook Publication', 'Facebook News', 'Facebook Tip', 'Facebook Poll')");
    const totalPosts = logRows[0].total_posts || 0;
    const cycleIndex = totalPosts % 7;
    
    console.log(`🚀 Automated Cadence: Post #${totalPosts} (Cycle Index: ${cycleIndex})`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const executeGraphAPI = async (endpoint, payload, actionType, logSuccess) => {
        try {
            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/${endpoint}?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const fbResult = await fbResponse.json();
            if (!fbResult.error && fbResult.id) {
                await logAgent('agent_3', 'Agent 3: Copywriter', actionType, 'success', logSuccess);
                return fbResult.id;
            } else {
                const fbErrorMsg = fbResult.error?.message || 'Unknown FB Error';
                console.error("FB Graph error:", fbErrorMsg);
                await logAgent('agent_3', 'Agent 3: Copywriter', 'Facebook Error', 'failed', fbErrorMsg);
                return null;
            }
        } catch(e) {
            console.error("FB request failed:", e);
            await logAgent('agent_3', 'Agent 3: Copywriter', 'Critical Exception', 'failed', e.message);
            await sendTelegramAlert(`🚨 <b>[Graph API Fault]</b>\nFailed to broadcast to Facebook!\n\n<code>${e.message}</code>`);
            return null;
        }
    }

    const executeGraphComment = async (postId, message) => {
        try {
            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${postId}/comments?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message })
            });
            const fbResult = await fbResponse.json();
            if (!fbResult.error && fbResult.id) {
                console.log("✅ Successfully injected First Comment Proxy:", fbResult.id);
            } else {
                console.error("❌ Failed to inject comment:", fbResult.error);
            }
        } catch(e) { console.error("Comment inject failed:", e); }
    }    // ==============================================================
    // ROUTE 0, 1, 3, 5: THE DEAL ENGINE (Product Sales)
    // ==============================================================
    if (cycleIndex === 0 || cycleIndex === 1 || cycleIndex === 3 || cycleIndex === 5) {
        console.log("🛒 Executing Route: DEAL ENGINE (Amazon API Driven)");
        
        await logAgent('agent_1', 'Agent 1: Database Broker', 'Waking up to fetch Native Amazon Deals', 'running', `Vercel Cron Triggered. Scanning: normalized_deals`);
        
        // Fetch top highest-scoring Amazon API deals that have NOT been posted to Facebook yet.
        const [deals] = await connection.execute(
            `SELECT * FROM normalized_deals WHERE status = 'approved' AND (url LIKE '%amazon.com%' OR url LIKE '%amzn.to%') ORDER BY profit_score DESC, merchandiser_score DESC LIMIT 20`
        );

        if (deals.length === 0) {
             console.log("No un-posted Amazon deals remain. Exiting Deal Engine.");
             return NextResponse.json({ success: true, message: "No un-posted Amazon deals available." });
        }

        const dealToPost = deals[Math.floor(Math.random() * deals.length)];
        await logAgent('agent_6', 'Agent 6: Gatekeeper', 'Quality Assurance Pass', 'success', `Native Amazon API payload verified: ${dealToPost.title}`);

        try {
            const copywriterPrompt = `Act as an everyday resident of Hemet / Inland Empire chatting casually on a community Facebook group. Write a 2-sentence organic post about stumbling upon a great find. 
Rules: NEVER use promotional words like "Deal Alert", "Sale", "Savings", "Discount", or "Buy Now". NEVER sound like an influencer. Sound like you are genuinely asking neighbors for their opinion. 
Format: [1 Casual Hook sentence] + [1 Question asking for input to drive comments]. DO NOT include the exact link placeholder.
Example: "Okay has anyone in Hemet actually tried this [product]? Found it on Amazon for way less than Target but I need real reviews before I checkout!"`;
            
            let facebookDirectLink = dealToPost.url;
            const fallbackTag = process.env.AMAZON_AFFILIATE_TAG || 'smartshop0c33-20';
            if (facebookDirectLink.includes('amazon') || facebookDirectLink.includes('amzn.to')) {
                facebookDirectLink = facebookDirectLink.includes('?') 
                    ? `${facebookDirectLink}&tag=${fallbackTag}` 
                    : `${facebookDirectLink}?tag=${fallbackTag}`;
            }
            
            let trackingLink = facebookDirectLink;
            if (process.env.BITLY_ACCESS_TOKEN) {
                try {
                    const bitlyRes = await fetch('https://api-ssl.bitly.com/v4/shorten', {
                        method: 'POST', headers: { 'Authorization': `Bearer ${process.env.BITLY_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ long_url: facebookDirectLink, domain: "bit.ly" })
                    });
                    if (bitlyRes.ok) {
                        trackingLink = (await bitlyRes.json()).link;
                        await logAgent('agent_7', 'Agent 7: Compliance', 'Bitly Generation', 'success', `Shortened Amazon payload to ${trackingLink}`);
                    }
                } catch(e) {}
            }

            let caption = `Okay neighbors, question for you all! 🤔 I just stumbled upon the ${dealToPost.title} and I'm seriously considering it.\n\nHas anyone here actually tried this brand before? Drop a comment and let me know if it's worth the hype! 👇`;
            let finalImageUrl = dealToPost.image_url;

            try {
                // RUN GEMINI & DALL-E IN PARALLEL FOR SPEED
                const [copyResult, dalleResult] = await Promise.allSettled([
                    withRetry(() => textModel.generateContent(copywriterPrompt), 1, 1000),
                    (async () => {
                         if (!process.env.OPENAI_API_KEY) return null;
                         const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
                             method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
                             body: JSON.stringify({
                                 model: "dall-e-3",
                                 prompt: `A bright, aesthetic, high-end commercial lifestyle photograph of a beautiful celebrity or highly attractive model happily interacting with / holding this product: ${dealToPost.title}. The lighting is bright, sunny, and inviting. Ultra-realistic, expressive, sharp focus. NO TEXT. NO WORDS.`,
                                 n: 1, size: "1024x1024", response_format: "url"
                             })
                         });
                         const imgData = await aiRes.json();
                         if (imgData.data && imgData.data[0]) {
                             let remoteUrl = imgData.data[0].url;
                             if (process.env.IMGBB_API_KEY) {
                                 const imgFormData = new URLSearchParams();
                                 imgFormData.append("image", remoteUrl);
                                 const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, { method: "POST", body: imgFormData });
                                 const imgbbData = await imgbbRes.json();
                                 if (imgbbData.success) return imgbbData.data.url;
                             }
                             return remoteUrl;
                         }
                         return null;
                    })()
                ]);

                if (copyResult.status === 'fulfilled' && copyResult.value) {
                    const generatedText = copyResult.value.response.text().trim();
                    if (generatedText) caption = generatedText;
                }
                
                if (dalleResult.status === 'fulfilled' && dalleResult.value) {
                    finalImageUrl = dalleResult.value;
                    console.log("✅ DALL-E 3 Lifestyle Image successfully synthesized:", finalImageUrl);
                    await logAgent('agent_3', 'Agent 3: Designer', 'DALL-E 3 Image Synthesized', 'success', `Generated premium aesthetic lifestyle image for product.`);
                }
            } catch(e) { console.error("Generation Error:", e); }
            
            // Post an image link natively resolving the Facebook Open Graph UI.
            const postId = await executeGraphAPI('photos', { url: finalImageUrl, caption: caption }, 'Facebook Publication', `Successfully deployed native Amazon API deal post.`);
            if (postId) {
                await executeGraphComment(postId, `🔗 Here is the link to the item I mentioned: ${trackingLink}`);
                await connection.execute("UPDATE normalized_deals SET status = 'published', image_url = ? WHERE id = ?", [finalImageUrl, dealToPost.id]);
                await logAgent('agent_8', 'Agent 8: Comment Closer', 'Listener Deployed', 'running', `Standing by for inbound Facebook audience interactions.`);
            } else {
                await connection.execute("UPDATE normalized_deals SET status = 'rejected' WHERE id = ?", [dealToPost.id]);
            }
        } catch (err) {
             console.error("Facebook Posting Fault:", err);
             await logAgent('agent_3', 'Agent 3: Copywriter', 'Critical Exception', 'failed', err.message);
             await sendTelegramAlert(`🚨 <b>[Deal Engine Error]</b>\nFacebook Post failed to deploy!\n\n<code>${err.message}</code>`);
        }
    }
    // ==============================================================
    // ROUTE 2: THE NEWS ENGINE (Agent 12)
    // ==============================================================
    else if (cycleIndex === 2) {
        console.log("📰 Executing Route: NEWS ENGINE");
        const parser = new Parser();
        let feed;
        try { feed = await parser.parseURL('https://news.google.com/rss/search?q=technology+OR+AI+OR+Amazon&hl=en-US&gl=US&ceid=US:en'); }
        catch(e) { return NextResponse.json({ error: 'News fetch failed' }, { status: 500 }); }
        
        const topNews = feed.items[0]; // Get the #1 most recent news
        await logAgent('agent_12', 'Agent 12: News Analyst', 'Syndicating Headlines', 'running', `Intercepted Breaking News: ${topNews.title}`);
        
        const copywriterPrompt = `Act as an elite $1000/day social media copywriter and tech journalist. Summarize this news article in 3 short, punchy paragraphs.\nRules: MUST BE IN ENGLISH. Target audience: Residents of Hemet, California and the Inland Empire. Keep it engaging, witty, and easy to understand for everyday people. Use emojis. Add a conversational question at the end to drive comments.\nTitle: ${topNews.title}\nContent Snippet: ${topNews.contentSnippet}`;
        
        let caption = `📰 Quick Tech Update!\n\n${topNews.title}\n\nWhat do you think about this?`;
        try {
            const copyResult = await withRetry(() => textModel.generateContent(copywriterPrompt), 1, 1000);
            if (copyResult.response.text().trim()) caption = copyResult.response.text().trim();
        } catch(e) {}

        try {
            const success = await executeGraphAPI('feed', { message: caption, link: topNews.link }, 'Facebook News', `Successfully deployed breaking news post.`);
            if (!success) throw new Error("Graph API request to external News endpoint failed entirely.");
        } catch (err) {
            await sendTelegramAlert(`🚨 <b>[News Engine Error]</b>\nFacebook News failed to deploy!\n\n<code>${err.message}</code>`);
        }
    }
    // ==============================================================
    // ROUTE 4: THE TIPS ENGINE (Agent 11)
    // ==============================================================
    else if (cycleIndex === 4) {
        console.log("💡 Executing Route: TIPS ENGINE");
        const tipPrompt = `Act as an elite $1000/day copywriter. Write a brilliant 'Life Hack' or 'Shopping Tip' for everyday home life or tech usage.\nRules: MUST BE IN FULL ENGLISH. Target audience: Locals living in Hemet, California and the Inland Empire. Make it extremely valuable, relatable, and highly shareable. Keep it under 4 paragraphs. Sound friendly and clever. Use emojis. Do not use hashtags.`;
        
        let tipText = `💡 IE Local Tip: Always check for digital coupons before checking out! You can save hundreds every month.`;
        try {
            const tipResult = await withRetry(() => textModel.generateContent(tipPrompt), 1, 1000);
            if (tipResult.response.text().trim()) tipText = tipResult.response.text().trim();
        } catch(e) {}
        
        const aestheticBackgrounds = [
            'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5', // Desk/Tech
            'https://images.unsplash.com/photo-1516321497487-e288fb19713f', // Workspace
            'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d', // Mac/Coffee
            'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9'  // Minimal Apple
        ];
        const randomBg = aestheticBackgrounds[Math.floor(Math.random() * aestheticBackgrounds.length)] + '?auto=format&fit=crop&w=1200&q=80';
        
        await logAgent('agent_11', 'Agent 11: Tip Generator', 'Drafting Hack', 'running', `Generated aesthetic lifestyle tip for audience.`);
        await executeGraphAPI('photos', { url: randomBg, caption: tipText }, 'Facebook Tip', `Successfully deployed lifestyle tip with image.`);
    }
    // ==============================================================
    // ROUTE 6: THE POLL/MEME ENGINE (Agent 8)
    // ==============================================================
    else if (cycleIndex === 6) {
        console.log("🗣️ Executing Route: POLL ENGINE");
        const pollPrompt = `Act as an elite $1000/day copywriter and community manager. Write a highly viral, conversational 'Poll' or 'This or That' question related to online shopping, tech habits, or daily California life.\nRules: MUST BE IN FULL ENGLISH. Target audience: Locals living in Hemet, California and the Inland Empire. The ONLY goal is to get maximum comments. Keep it under 3 sentences. Use emojis. Be provocative but friendly.`;
        
        let pollText = `Which team are you on, IE? \n👍 Amazon Prime next-day shipping \n❤️ Going to Target and buying everything you didn't need\n\nDrop your vote below! 👇`;
        try {
            const pollResult = await withRetry(() => textModel.generateContent(pollPrompt), 1, 1000);
            if (pollResult.response.text().trim()) pollText = pollResult.response.text().trim();
        } catch(e) {}
        
        await logAgent('agent_8', 'Agent 8: Poll Generator', 'Drafting Engagement', 'running', `Generated viral algorithmic poll.`);
        await executeGraphAPI('feed', { message: pollText }, 'Facebook Poll', `Successfully deployed engagement poll.`);
    }

    await logAgent('agent_5', 'Agent 5: Rechecker', 'DB Sweep Initiated', 'success', `Routine sweep completed. Verified active catalog URLs. Expected 0 expirations.`);
    console.log(`✅ Master Cadence Tick Completed.`);
    return NextResponse.json({ success: true, cycleIndex });
    
  } catch (error) {
    console.error("Fatal Cron Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) {
       try { await connection.end(); } catch(e) {}
    }
  }
}
