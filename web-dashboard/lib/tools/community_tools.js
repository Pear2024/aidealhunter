import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getPageCommentsTool = tool(
    async () => {
        try {
            if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_ACCESS_TOKEN) return "Simulation Mode: No FB Credentials. Assuming 1 fake comment on a MacBook deal asking 'Can I pay in installments?'.";
            
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/published_posts?fields=id,message,comments{id,message,from,comments}&limit=5&access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`);
            const data = await fbRes.json();
            
            if (data.error) return `FB API Error: ${data.error.message}`;
            if (!data.data || data.data.length === 0) return "No recent posts found to check for comments.";
            
            let unresolvedComments = [];
            
            data.data.forEach(post => {
                if (post.comments && post.comments.data) {
                    post.comments.data.forEach(comment => {
                        const hasReplies = comment.comments && comment.comments.data && comment.comments.data.length > 0;
                        if (!hasReplies && comment.from.id !== process.env.FB_PAGE_ID) {
                            unresolvedComments.push({
                                post_message: post.message ? post.message.substring(0, 100) + '...' : 'Photo Post',
                                comment_id: comment.id,
                                user_name: comment.from.name,
                                message: comment.message
                            });
                        }
                    });
                }
            });
            
            if (unresolvedComments.length === 0) return "All comments have been replied to, or there are no new comments.";
            
            return JSON.stringify(unresolvedComments);
        } catch (e) {
            return `Error fetching comments: ${e.message}`;
        }
    },
    {
        name: "get_unanswered_comments",
        description: "Fetches recent comments from the Facebook Page that haven't been replied to yet by the page admin.",
        schema: z.object({})
    }
);

export const replyToFacebookCommentTool = tool(
    async ({ comment_id, reply_message }) => {
        try {
            if (!process.env.FB_PAGE_ACCESS_TOKEN) return "Simulation Mode: Pretending to reply to Facebook comment successfully.";
            
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${comment_id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: reply_message,
                    access_token: process.env.FB_PAGE_ACCESS_TOKEN
                })
            });
            const data = await fbRes.json();
            if (data.error) return `Error replying: ${data.error.message}`;
            return `SUCCESS: Replied to comment ${comment_id} with ID ${data.id}`;
        } catch(e) {
            return `Error replying: ${e.message}`;
        }
    },
    {
        name: "reply_to_comment",
        description: "Posts a reply to a specific Facebook comment on the page.",
        schema: z.object({
            comment_id: z.string().describe("The Facebook Graph API ID of the comment directly from the fetch output."),
            reply_message: z.string().describe("The charming, helpful, and highly persuasive reply message to the individual user.")
        })
    }
);

export const publishOrganicPostTool = tool(
    async ({ message, image_prompt }) => {
         try {
             let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(image_prompt)}?width=1080&height=1080&nologo=true`;
             
             if (process.env.OPENAI_API_KEY) {
                const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "dall-e-3",
                        prompt: image_prompt + " Style: High-quality engaging lifestyle image, hyper-realistic, beautiful lighting, no text.",
                        n: 1,
                        size: "1024x1024",
                        response_format: "url"
                    })
                });
                const imgData = await aiRes.json();
                if (imgData.data && imgData.data[0]) {
                    imageUrl = imgData.data[0].url; // For native FB photo posts, ephemeral URLs are fine since FB immediately downloads it.
                }
             }

             if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_ACCESS_TOKEN) return "Simulation Mode: Pretending to publish organic post. Success!";

             const fbRes = await fetch(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/photos?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     message: message,
                     url: imageUrl
                 })
             });
             const data = await fbRes.json();
             if (data.error) return `FB Post Error: ${data.error.message}`;
             return `SUCCESS: Organic Post published with ID ${data.id}`;
         } catch(e) {
             return `Error publishing organic post: ${e.message}`;
         }
    },
    {
        name: "publish_organic_post",
        description: "Creates an interactive, engaging organic post (Shopping Hack, Q&A, Poll, or Humor) on Facebook using a beautiful generated background image.",
        schema: z.object({
            message: z.string().describe("The highly engaging post text. Must include emojis."),
            image_prompt: z.string().describe("The visual prompt for the DALL-E image generator to create an image matching the post message.")
        })
    }
);
