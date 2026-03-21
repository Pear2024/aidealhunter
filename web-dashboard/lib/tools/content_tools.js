import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getConnection } from '@/lib/db';

export const fetchApprovedDealTool = tool(
  async () => {
    let connection;
    try {
        connection = await getConnection();
        const [deals] = await connection.execute(
            `SELECT * FROM normalized_deals WHERE status = 'approved' AND id NOT IN (SELECT source_deal_id FROM ai_blog_posts WHERE source_deal_id IS NOT NULL) ORDER BY merchandiser_score DESC, created_at DESC LIMIT 1`
        );
        
        let targetDeal = null;

        if (deals.length === 0) {
            // FALLBACK FOR TESTING: If cron jobs snatched it, just grab ANY approved deal so the user can test DALL-E 3!
            const [backupDeals] = await connection.execute(
                `SELECT * FROM normalized_deals WHERE status = 'approved' ORDER BY id DESC LIMIT 1`
            );
            if (backupDeals.length === 0) {
                return "No pending approved deals available. Mission abort.";
            }
            targetDeal = backupDeals[0];
        } else {
            targetDeal = deals[0];
        }
        
        return JSON.stringify({
            source_deal_id: targetDeal.id,
            title: targetDeal.title,
            brand: targetDeal.brand,
            original_price: targetDeal.original_price,
            discount_price: targetDeal.discount_price,
            url: targetDeal.url,
            image_url: targetDeal.image_url
        });
    } catch (e) { 
        return `Error fetching deal: ${e.message}`; 
    } finally {
        if (connection) await connection.end();
    }
  },
  {
      name: "fetch_approved_deal",
      description: "Fetches exactly ONE approved high-quality deal from the database that needs a Blog Post and Facebook Post written for it. Call this FIRST.",
      schema: z.object({})
  }
);

export const publishSeoBlogTool = tool(
  async ({ source_deal_id, title, slug, content_html, generated_image_prompt }) => {
    let connection;
    try {
        connection = await getConnection();
        let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(generated_image_prompt)}?width=1200&height=630&nologo=true`;

        // Use OpenAI DALL-E 3 if available
        if (process.env.OPENAI_API_KEY) {
            try {
                const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "dall-e-3",
                        prompt: generated_image_prompt + " Style: High-end lifestyle commercial photography, showing human interaction, ultra-realistic, highly detailed, beautiful lighting, engaging, no text.",
                        n: 1,
                        size: "1024x1024",
                        response_format: "url"
                    })
                });
                const imgData = await aiRes.json();
                if (imgData.data && imgData.data[0]) {
                    const remoteUrl = imgData.data[0].url;
                    
                    // Fetch DALL-E image and pipe to ImgBB because OpenAI URLs expire in 1 hour
                    const fetchRes = await fetch(remoteUrl);
                    const buffer = await fetchRes.arrayBuffer();
                    const base64Image = Buffer.from(buffer).toString('base64');
                    
                    if (process.env.IMGBB_API_KEY) {
                        const imgFormData = new URLSearchParams();
                        imgFormData.append("image", base64Image);
                        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
                            method: "POST",
                            body: imgFormData
                        });
                        const imgbbData = await imgbbRes.json();
                        
                        if (imgbbData.success) {
                            imageUrl = imgbbData.data.url; // Database will store this permanent ImgBB direct URL
                            console.log("✅ DALL-E Image successfully uploaded to ImgBB:", imageUrl);
                        } else {
                            throw new Error("ImgBB Upload Failed: " + JSON.stringify(imgbbData));
                        }
                    } else {
                         // Fallback mechanism if no ImgBB key
                         console.warn("No IMGBB_API_KEY found! Using ephemeral DALL-E URL which will expire in 1 hour.");
                         imageUrl = remoteUrl;
                    }
                }
            } catch (dalleErr) {
                console.error("DALL-E 3 Generation Failed, falling back to free Pollinations:", dalleErr);
            }
        }

        const [insertResult] = await connection.execute(
            `INSERT INTO ai_blog_posts (slug, title, content_html, image_url, source_deal_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
            [slug, title, content_html, imageUrl, source_deal_id]
        );
        
        return `SUCCESS: Blog post published with ID ${insertResult.insertId}. Slug: /blog/${slug}`;
    } catch (e) { 
        return `Error publishing blog: ${e.message}`; 
    } finally {
        if (connection) await connection.end();
    }
  },
  {
      name: "publish_seo_blog_post",
      description: "Saves the generated HTML blog post to the database.",
      schema: z.object({
          source_deal_id: z.number().describe("The ID of the deal this blog is about"),
          title: z.string().describe("The highly catchy SEO Blog Title focusing on the deal/product (Under 60 chars)"),
          slug: z.string().describe("The URL slug (e.g. 'best-apple-laptop-deal-2026')"),
          content_html: z.string().describe("The full pure HTML content. MUST use precise HTML tags (<h2>, <p>, <strong>, <ul>, <li>). MUST NOT contain Markdown block ticks. Include an affiliate CTA button link."),
          generated_image_prompt: z.string().describe("A highly detailed prompt for an AI Image Generator to create the cover art (e.g. 'Hyper-realistic photography of an Apple Watch on a minimalist desk')")
      })
  }
);

export const publishFacebookPostTool = tool(
  async ({ caption_text, link_url }) => {
    try {
        if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_ACCESS_TOKEN) {
             return "SKIPPED: Facebook credentials not configured in environment. But I assume it was successful for simulation.";
        }
        
        const fbPayload = {
            message: caption_text,
            link: link_url,
            access_token: process.env.FB_PAGE_ACCESS_TOKEN
        };

        const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fbPayload)
        });
        
        const fbResult = await fbResponse.json();
        if (fbResult.error) return `FB API Error: ${fbResult.error.message}`;
        return `SUCCESS: Posted to Facebook with ID ${fbResult.id}`;
    } catch (e) { return `Error posting to FB: ${e.message}`; }
  },
  {
      name: "publish_facebook_post",
      description: "Publishes a snappy, viral caption and a link to the Facebook Page.",
      schema: z.object({
          caption_text: z.string().describe("The viral Facebook caption including emojis, hype about the price, and hashtags"),
          link_url: z.string().describe("The URL to link in the post. Since this is an affiliate deal, use the Redirect Link.")
      })
  }
);

export const saveReelsScriptTool = tool(
  async ({ source_deal_id, title, nano_banana_prompt, voiceover_script }) => {
    let connection;
    try {
        connection = await getConnection();
        // Ensure table exists for nano banana scripts
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS ai_reels_scripts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                source_deal_id INT,
                title VARCHAR(255),
                nano_banana_prompt TEXT,
                voiceover_script TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const [insertResult] = await connection.execute(
            `INSERT INTO ai_reels_scripts (source_deal_id, title, nano_banana_prompt, voiceover_script) VALUES (?, ?, ?, ?)`,
            [source_deal_id, title, nano_banana_prompt, voiceover_script]
        );
        return `SUCCESS: Reels Script saved with ID ${insertResult.insertId}.`;
    } catch (e) {
        return `Error saving script: ${e.message}`;
    } finally {
        if (connection) await connection.end();
    }
  },
  {
      name: "save_reels_script",
      description: "Saves a generated Video Script tailored for 'Nano Banana' AI Video Maker.",
      schema: z.object({
          source_deal_id: z.number().describe("The ID of the deal"),
          title: z.string().describe("Title of the video"),
          nano_banana_prompt: z.string().describe("A highly detailed text-to-video prompt for 'Nano Banana' AI. Must include camera movement, lighting, subject (the product), and cinematic style."),
          voiceover_script: z.string().describe("The snappy, 15-second voiceover script for the Reel/TikTok.")
      })
  }
);
