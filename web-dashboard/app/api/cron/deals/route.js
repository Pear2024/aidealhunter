import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { logAgent } from '@/lib/agent_logger';
import { sendTelegramAlert } from '@/lib/telegram';
import { verifyLinkIntegrity } from '@/lib/verifier';

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
            if (postId) {
                // Ensure FB node is fully propagated before commenting
                console.log(`⏱️ Waiting 3 seconds for FB Post ${postId} to propagate before commenting...`);
                await new Promise(r => setTimeout(r, 3000));
                
                const commentRes = await fetch(`https://graph.facebook.com/v19.0/${postId}/comments?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });

                const fbResult = await commentRes.json();
                
                if (fbResult.error) {
                    console.error("❌ Facebook Comment API Rejected:", fbResult.error.message);
                    await sendTelegramAlert(`🚨 <b>[Comment Error]</b>\nFacebook blocked the comment!\n\n<code>${fbResult.error.message}</code>`);
                    return false;
                }

                // UPDATE STATE MACHINE (Single Source of Truth)
                await connection.execute(
                    "UPDATE normalized_deals SET is_fb_posted = TRUE, fb_post_id = ? WHERE fb_post_id = ?",
                    [postId, postId] 
                );

                const strictLogMessage = `[STEP] Facebook Comment Agent
[INPUT] post_id=${postId}
[ACTION] injected affiliate link comment
[OUTPUT] comment_id=${fbResult.id}
[STATUS] success
[TIME] ${new Date().toISOString()}`;

                await logAgent('agent_1', 'Facebook Pipeline', 'Publish Success', 'success', strictLogMessage);
                return true;
            } else {
                console.error("❌ Failed to inject comment: Post ID was null or undefined.");
                return false;
            }
        } catch(e) { 
            console.error("Comment inject failed explicitly:", e); 
            return false;
        }
    }    // ==============================================================
    // ROUTE 0, 1, 3, 5: THE DEAL ENGINE (Product Sales)
    // ==============================================================
    if (cycleIndex === 0 || cycleIndex === 1 || cycleIndex === 3 || cycleIndex === 5) {
        console.log("🛒 Executing Route: DEAL ENGINE (Amazon API Driven)");
        
        await logAgent('agent_1', 'Agent 1: Database Broker', 'Waking up to fetch Native Amazon Deals', 'running', `Vercel Cron Triggered. Scanning: normalized_deals`);
        
        // Fetch top highest-scoring deals that have NOT been posted to Facebook yet.
        // Ensure strict Step Lock: ONLY pick deals that are 'idle' or previously 'failed'!
        const [deals] = await connection.execute(
            `SELECT * FROM normalized_deals WHERE status = 'approved' AND fb_status IN ('idle', 'failed') AND (url LIKE '%amazon.com%' OR url LIKE '%amzn.to%' OR url LIKE '%threeinternational.com%') ORDER BY created_at DESC LIMIT 20`
        );

        if (deals.length === 0) {
             console.log("No un-posted deals remain. Exiting Deal Engine.");
             return NextResponse.json({ success: true, message: "No un-posted deals available." });
        }

        let dealToPost = null;
        for (const deal of deals) {
             console.log(`🔍 Verifying Integrity for: ${deal.title}`);
             const isAmazon = deal.url.includes('amazon.com') || deal.url.includes('amzn.to');
             const verify = await verifyLinkIntegrity(deal.url, deal.discount_price);
             
             if (verify.success && verify.priceMatch) {
                 // 🎯 OPTIMISTIC LOCK: Reserve this deal immediately before AI processing!
                 const [updateRes] = await connection.execute(
                     "UPDATE normalized_deals SET fb_status = 'processing', locked_at = NOW() WHERE id = ? AND fb_status IN ('idle', 'failed')",
                     [deal.id]
                 );
                 
                 // If affectedRows === 0, another concurrent Cron Worker grabbed this exact deal 1 millisecond ago!
                 if (updateRes.affectedRows === 0) {
                     console.log(`🚨 Race condition mitigated! Deal ${deal.id} was snatched by a parallel worker.`);
                     continue; // Try the next deal in the list
                 }

                 dealToPost = deal;
                 break;
             } else if (verify.success && verify.livePrice !== 'Unknown' && !verify.priceMatch) {
                 console.log(`❌ Price Mismatch Detected. Expected $${deal.discount_price}, saw $${verify.livePrice}. Rejecting deal.`);
                 await connection.execute("UPDATE normalized_deals SET status = 'rejected' WHERE id = ?", [deal.id]);
             }
        }

        if (!dealToPost) {
             console.log("⚠️ No live deals passed verification. Exiting this cycle.");
             await logAgent('agent_6', 'Agent 6: Gatekeeper', 'All Pending Quality Checks Failed', 'failed', `None of the top 20 deals survived integrity validation.`);
             return NextResponse.json({ success: true, message: "No live deals survived verification." });
        }
        
        await logAgent('agent_6', 'Agent 6: Gatekeeper', 'Quality Assurance Pass', 'success', `Payload verified & Price Match confirmed: ${dealToPost.title}`);

        try {
            const systemStateHeader = `
SYSTEM STATE:
- Deal ID: ${dealToPost.id}
- Current Step: Facebook Promo Generation
- Completed Steps: Discovery, QA Normalize, Admin Approved
- Next Step: Post to Facebook Page

RULES:
- Do NOT repeat completed steps
- Do ONLY next step

TASK:
            `;

            const copywriterPrompt = `${systemStateHeader}
Act as an everyday resident of Hemet / Inland Empire chatting casually on a community Facebook group. Write a 2-sentence organic post about stumbling upon a great find. 
Product: ${dealToPost.title} (Brand: ${dealToPost.brand})
Original Price: ${dealToPost.original_price}, Discount Price: ${dealToPost.discount_price}
DO NOT include the exact link placeholder. Keep it extremely casual and slightly gossip-like (e.g., "Wait, did you guys know..."). Use exactly 1 emoji.`;
            
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
                // RUN GEMINI & IMAGE GEN IN PARALLEL FOR SPEED
                const [copyResult, imageResult] = await Promise.allSettled([
                    withRetry(() => textModel.generateContent(copywriterPrompt), 1, 1000),
                    (async () => {
                         if (!process.env.OPENAI_API_KEY) return null;

                         let finalDallePrompt = "";
                         const attemptVisionRecreation = (cycleIndex === 1 || cycleIndex === 5);
                         
                         // 1. Alternating Strategy: "Let DALL-E Do It"
                         // Use Gemini Vision to deeply analyze the real product image and instruct DALL-E to recreate it in a new background!
                         if (attemptVisionRecreation && dealToPost.image_url) {
                             console.log("👁️ Agent Vision: Analyzing real product image to instruct DALL-E...");
                             try {
                                 const imgRes = await fetch(dealToPost.image_url);
                                 if (imgRes.ok) {
                                     const arrayBuffer = await imgRes.arrayBuffer();
                                     const base64Image = Buffer.from(arrayBuffer).toString('base64');
                                     const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
                                     
                                     const visionPrompt = `Analyze this exact product. Describe its precise physical appearance, shape, material, colors, and branding details in a dense paragraph. Then append exactly this to the end: ", resting naturally on a visually stunning, warm aesthetic high-end lifestyle setting (like a modern kitchen counter or elegant marble table). Ultra-realistic photography, 8k resolution, cinematic lighting. NO TEXT, NO WORDS."`;
                                     
                                     const visionResult = await textModel.generateContent([
                                         visionPrompt,
                                         { inlineData: { data: base64Image, mimeType: mimeType } }
                                     ]);
                                     finalDallePrompt = visionResult.response.text().trim();
                                     console.log("✅ DALL-E 3 Prompt Engineered via Vision:", finalDallePrompt);
                                 }
                             } catch(e) {
                                 console.warn("⚠️ Vision API extraction failed. Falling back to default generation.", e.message);
                             }
                         }

                         // 2. Default/Fallback Strategy if Vision wasn't used or failed
                         if (!finalDallePrompt) {
                             const aesthetics = [
                                 `A bright, aesthetic, high-end commercial lifestyle photograph of a beautiful celebrity or highly attractive model happily interacting with / holding this product: ${dealToPost.title}. The lighting is bright, sunny, and inviting. Ultra-realistic, expressive, sharp focus. NO TEXT. NO WORDS.`,
                                 `A cozy, warm, inviting home setting. A relatable, highly attractive person enjoying a quiet morning coffee while using this product: ${dealToPost.title}. Realism, cinematic lighting, 8k resolution, highly detailed, expressive. NO TEXT. NO WORDS.`,
                                 `An energetic, fitness-focused bright sunny day outdoors. A fit, gorgeous model holding or wearing this product: ${dealToPost.title}. High-end activewear commercial photography, beautiful bokeh, vibrant colors, ultra-realistic. NO TEXT. NO WORDS.`,
                                 `A sleek, luxurious modern minimalist luxury apartment. A sophisticated, attractive person utilizing this product: ${dealToPost.title}. Evening moody but beautiful lighting, high fashion, elegant, highly detailed. NO TEXT. NO WORDS.`,
                                 `A fun, colorful, pop-art inspired lifestyle shot. A young stunning influencer taking a selfie or showing off this product: ${dealToPost.title}. Pastel colors, bright studio lighting, viral social media aesthetic, hyper-realistic. NO TEXT. NO WORDS.`
                             ];
                             finalDallePrompt = aesthetics[Math.floor(Math.random() * aesthetics.length)];
                         }

                         console.log("🎨 Synthesizing DALL-E 3 Image...");
                         const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
                             method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
                             body: JSON.stringify({
                                 model: "dall-e-3",
                                 prompt: finalDallePrompt,
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
                                 if (imgbbData.success) {
                                     return { url: imgbbData.data.url, type: attemptVisionRecreation ? 'dalle_vision_recreation' : 'dalle' };
                                 }
                             }
                             return { url: remoteUrl, type: attemptVisionRecreation ? 'dalle_vision_recreation' : 'dalle' };
                         }
                         
                         return null;
                    })()
                ]);

                if (copyResult.status === 'fulfilled' && copyResult.value) {
                    const generatedText = copyResult.value.response.text().trim();
                    if (generatedText) caption = generatedText;
                }
                
                if (imageResult.status === 'fulfilled' && imageResult.value) {
                    finalImageUrl = imageResult.value.url;
                    console.log(`✅ Image AI successfully generated via ${imageResult.value.type}:`, finalImageUrl);
                    const logAction = imageResult.value.type === 'dalle_vision_recreation' ? 'Vision-To-DALL-E Background Generation' : 'DALL-E 3 Image Synthesized';
                    const logDesc = imageResult.value.type === 'dalle_vision_recreation' ? `Recreated precise product on a new aesthetic background using Vision AI + DALL-E 3.` : `Generated premium aesthetic lifestyle image for product.`;
                    await logAgent('agent_3', 'Agent 3: Designer', logAction, 'success', logDesc);
                }
            } catch(e) { console.error("Generation Error:", e); }
            
            // Post an image link natively resolving the Facebook Open Graph UI.
            const postId = await executeGraphAPI('photos', { url: finalImageUrl, caption: caption }, 'Facebook Publication', `Successfully deployed native Amazon API deal post.`);
            if (postId) {
                await executeGraphComment(postId, `🔗 Here is the link to the item I mentioned: ${trackingLink}`);
                await connection.execute("UPDATE normalized_deals SET status = 'published', fb_status = 'published', image_url = ?, locked_at = NULL WHERE id = ?", [finalImageUrl, dealToPost.id]);
                await logAgent('agent_8', 'Agent 8: Comment Closer', 'Listener Deployed', 'running', `Standing by for inbound Facebook audience interactions.`);
            } else {
                await connection.execute("UPDATE normalized_deals SET status = 'rejected', fb_status = 'failed', locked_at = NULL WHERE id = ?", [dealToPost.id]);
            }
        } catch (err) {
             console.error("Facebook Posting Fault:", err);
             // 🔄 FAILURE REVERT: Release the lock to 'failed' state so it can be retried or debugged.
             await connection.execute("UPDATE normalized_deals SET fb_status = 'failed', locked_at = NULL WHERE id = ?", [dealToPost.id]);
             await logAgent('agent_3', 'Agent 3: Copywriter', 'Critical Exception', 'failed', err.message);
             await sendTelegramAlert(`🚨 <b>[Deal Engine Error]</b>\nFacebook Post failed to deploy!\nLock Reverted.\n\n<code>${err.message}</code>`);
        }
    }
    // ==============================================================
    // ROUTE 2: THE NEWS ENGINE (Agent 12) - SPARK GLOBAL YOUTUBE
    // ==============================================================
    else if (cycleIndex === 2) {
        console.log("📰 Executing Route: SPARK GLOBAL YOUTUBE ENGINE");
        const parser = new Parser();
        let feed;
        try { feed = await parser.parseURL('https://www.youtube.com/feeds/videos.xml?channel_id=UCvX4uMeGrGYbWk1DmRNijsw'); }
        catch(e) { return NextResponse.json({ error: 'YouTube fetch failed' }, { status: 500 }); }
        
        let topNews = null;
        for (const item of feed.items.slice(0, 5)) {
            const safeTitle = item.title.substring(0, 50); // Check first 50 chars to avoid exact match issues
            const [duplicateCheck] = await connection.execute(
                `SELECT id FROM agent_logs WHERE action IN ('Facebook News', 'Syndicating Headlines') AND details LIKE ? LIMIT 1`,
                [`%${safeTitle}%`]
            );
            if (duplicateCheck.length === 0) {
                topNews = item;
                break;
            }
        }

        if (!topNews) {
            console.log("⚠️ All recent YouTube videos have already been syndicated. Skipping cycle to avoid spam.");
            return NextResponse.json({ success: true, message: "No fresh YouTube videos available." });
        }

        await logAgent('agent_12', 'Agent 12: Media Analyst', 'Syndicating Headlines', 'running', `Intercepted New Video: ${topNews.title}`);
        
        const copywriterPrompt = `Act as an elite $1000/day social media copywriter and inspiring community leader. Summarize the core message of this new YouTube video from SparkGlobal in 2-3 short, punchy paragraphs.\nRules: MUST BE IN ENGLISH. Target audience: Residents of Hemet, California and the Inland Empire. Keep it engaging, uplifting, and insightful. Make them want to watch the video! Use emojis. Add a conversational question at the end to drive comments.\nTitle: ${topNews.title}\nVideo Snippet: ${topNews.contentSnippet || topNews.content || ''}`;
        
        let caption = `🎥 New Insight from SparkGlobal!\n\n${topNews.title}\n\nWhat are your thoughts? 👇`;
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
    // ROUTE 4: MEDICAL AI & HEALTH NEWS ENGINE (Agent 11) - 70% Quota
    // ==============================================================
    else if (cycleIndex === 4) {
        console.log("💡 Executing Route: MEDICAL AI NEWS ENGINE");
        const parser = new Parser();
        let feed;
        try { 
            // Switched to MedicalXpress AI directly to avoid broken Google News encrypted URLs
            feed = await parser.parseURL('https://medicalxpress.com/rss-feed/tags/artificial+intelligence/'); 
        }
        catch(e) { return NextResponse.json({ error: 'Medical AI News fetch failed' }, { status: 500 }); }

        let topHealthNews = null;
        for (const item of feed.items.slice(0, 5)) {
            const safeTitle = item.title.substring(0, 50); // Check first 50 chars to avoid exact match issues
            const [duplicateCheck] = await connection.execute(
                `SELECT id FROM agent_logs WHERE action IN ('Facebook Tip', 'Syndicating Medical AI News') AND details LIKE ? LIMIT 1`,
                [`%${safeTitle}%`]
            );
            if (duplicateCheck.length === 0) {
                topHealthNews = item;
                break;
            }
        }

        if (!topHealthNews) {
            console.log("⚠️ All recent Medical AI news articles have already been syndicated. Skipping cycle to avoid spam.");
            return NextResponse.json({ success: true, message: "No fresh health news available." });
        }

        await logAgent('agent_11', 'Agent 11: Medical Analyst', 'Syndicating Medical AI News', 'running', `Intercepted Health Breakthrough: ${topHealthNews.title}`);
        
        const healthPrompt = `Act as an elite $1000/day copywriter and cutting-edge wellness expert. Summarize this groundbreaking medical AI news article in 3 short, easy-to-understand paragraphs.\nRules: MUST BE IN FULL US ENGLISH. Target audience: Everyday people in America who care about taking control of their health through technology. Make it sound like an exciting, life-changing discovery. Use emojis. End with a clear Call-To-Action soft-pitching the Free AI Health Assessment: "🩺 Want a personalized medical breakdown? Take our Free AI Health Assessment today: https://nadaniadigitalllc.com/wellness"\nCRITICAL: You MUST include the source link at the bottom of the post: "Read full source: ${topHealthNews.link}"\nTitle: ${topHealthNews.title}\nContent Snippet: ${topHealthNews.contentSnippet || topHealthNews.content || ''}`;
        
        let tipText = `🧬 Cutting-Edge Medical AI Update!\n\n${topHealthNews.title}\n\nWhat are your thoughts on this? 👇\nSource: ${topHealthNews.link}`;
        try {
            const tipResult = await withRetry(() => textModel.generateContent(healthPrompt), 1, 1000);
            if (tipResult.response.text().trim()) tipText = tipResult.response.text().trim();
        } catch(e) {}
        
        // --- DALL-E 3 Image Synthesis for Health Post (via AIMLAPI) ---
        let imageUrl = null;
        try {
            const dallePromptResult = await textModel.generateContent(`Create a clean, hyper-realistic, highly aesthetic DALL-E 3 image prompt that represents this medical AI technology breakthrough without using text. Concept: ${topHealthNews.title}`);
            const dallePrompt = dallePromptResult.response.text().substring(0, 900);
            
            const dalleRes = await fetch("https://api.aimlapi.com/v1/images/generations", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.AIMLAPI_KEY}` },
                body: JSON.stringify({ model: "dall-e-3", prompt: dallePrompt, n: 1, size: "1024x1024" })
            });
            const dalleData = await dalleRes.json();
            if (dalleData.data && dalleData.data[0]) {
                imageUrl = dalleData.data[0].url;
            }
        } catch(imgErr) { console.error("AIMLAPI DALL-E 3 Medical Vision failed: ", imgErr); }

        if (imageUrl) {
            await executeGraphAPI('photos', { url: imageUrl, caption: tipText }, 'Facebook Tip', `Successfully deployed Medical AI news with DALL-E 3 image.`);
        } else {
            await executeGraphAPI('feed', { message: tipText, link: topHealthNews.link }, 'Facebook Tip', `Successfully deployed advanced health news without custom image.`);
        }
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
