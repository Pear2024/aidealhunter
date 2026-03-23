import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getConnection } from '@/lib/db';

export const saveMultichannelGroceryHitTool = tool(
  async ({ title, estimated_price, brand, category }) => {
    try {
        console.log(`Saving Multichannel Grocery Hit: ${title}`);
        
        // Generate Deep Search Affiliate URLs to bypass Cloudflare catalog blockers
        // The user receives commission when the buyer searches and adds to cart
        const encodedTitle = encodeURIComponent(title);
        
        // Construct the 3 affiliate search trajectories
        const yamiUrl = `https://www.yamibuy.com/en/search?q=${encodedTitle}&track=affiliate_auto`;
        const hmartUrl = `https://www.instacart.com/store/h-mart/search/${encodedTitle}?share_id=ai_agent_hunter`;
        const ranchUrl = `https://www.instacart.com/store/99-ranch-market/search/${encodedTitle}?share_id=ai_agent_hunter`;
        
        // We save the primary URL as Yamibuy for the main button, but the AI Writer can promote all 3!
        const primaryUrl = yamiUrl;
        
        // Use a placeholder or generic image since we bypassed the scraper
        // The DALL-E agent will override this with a beautiful lifestyle image anyway during publishing
        const fallbackImage = "https://images.unsplash.com/photo-1583258292688-d0213dc15a4c?q=80&w=800&auto=format&fit=crop";

        const connection = await getConnection();
        try {
            // Check if we already have this grocery item trending
            const [rows] = await connection.execute('SELECT id FROM normalized_deals WHERE title = ? AND status IN ("pending", "approved")', [title]);
            
            if (rows.length === 0) {
                await connection.execute(
                    `INSERT INTO normalized_deals (
                        title, brand, original_price, discount_price, 
                        url, status, submitter_id, vote_score, merchandiser_score, image_url, category
                    ) VALUES (?, ?, ?, ?, ?, 'pending', 'agent_asian_grocery', 0, 95, ?, ?)`,
                    [title, brand || 'Asian Grocery', null, estimated_price, primaryUrl, fallbackImage, category || 'Groceries']
                );
                return `SUCCESS: Saved "${title}" to the Trending Product Pool.`;
            } else {
                return `SKIPPED: "${title}" is already in the queue. Try another product.`;
            }
        } finally {
            await connection.end();
        }
    } catch (e) { 
        return `Error inserting grocery hit: ${e.message}`; 
    }
  },
  {
      name: "save_multichannel_grocery_hit",
      description: "Generates trackable affiliate deep-links for Yamibuy and Instacart (H-Mart/99 Ranch) for a provided Asian grocery product, and securely saves it to the Trending Pool.",
      schema: z.object({
          title: z.string().describe("The exact name of the popular Asian grocery item (e.g. 'Nongshim Shin Ramyun Black', 'Lao Gan Ma Chili Crisp')"),
          brand: z.string().describe("The brand name of the product"),
          estimated_price: z.number().describe("Your best exact algorithmic estimation of its USD retail price (e.g. 5.99)"),
          category: z.string().describe("The specific grocery category (e.g. 'Snacks', 'Noodles', 'Condiments')")
      })
  }
);
