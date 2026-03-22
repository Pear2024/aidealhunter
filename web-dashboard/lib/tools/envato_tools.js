import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getConnection } from '../db';
import crypto from 'crypto';

export const fetchPopularEnvatoItemsTool = tool(
  async ({ category }) => {
    // category enum: 'themeforest', 'codecanyon'
    const token = process.env.ENVATO_API_KEY;
    if (!token) return { error: "ENVATO_API_KEY is missing." };

    try {
        const res = await fetch(`https://api.envato.com/v1/market/popular:${category}.json`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.popular && data.popular.items_last_week) {
            // Get top 3 items of the week
            const topItems = data.popular.items_last_week.slice(0, 3).map(i => ({
                id: i.id,
                title: i.item,
                url: i.url,
                price: parseFloat(i.cost),
                thumbnail: i.thumbnail,
                sales: parseInt(i.sales)
            }));
            return JSON.stringify({ success: true, items: topItems });
        }
        return JSON.stringify({ error: "No popular items found at this time." });
    } catch (e) {
        return JSON.stringify({ error: e.message });
    }
  },
  {
    name: 'fetch_envato_bestsellers',
    description: "Fetches the absolute best-selling digital items of the week from either 'themeforest' (website themes) or 'codecanyon' (software plugins). Returns an array of items.",
    schema: z.object({
        category: z.enum(['themeforest', 'codecanyon']).describe("The Envato marketplace to query.")
    }),
  }
);

export const saveEnvatoDealsTool = tool(
    async ({ deals }) => {
        let connection;
        try {
            connection = await getConnection();
            
            // Envato affiliate link injection using impact radius URL or ref ID
            const impactLink = process.env.ENVATO_AFFILIATE_LINK || ''; // Provide a fallback mechanism
            const refUsername = process.env.ENVATO_REF_ID || 'naddania'; // Default fallback
            
            const results = [];
            for (const deal of deals) {
                // If impactLink is set, append URL to impact structure. If not, use standard ?ref= fallback.
                let affiliateUrl = `${deal.url}?ref=${refUsername}`;
                
                const [result] = await connection.execute(
                    `INSERT INTO normalized_deals (
                        title, brand, original_price, discount_price, 
                        url, status, submitter_id, vote_score, merchandiser_score, image_url, category
                    ) VALUES (?, ?, ?, ?, ?, 'approved', 'agent_envato', 80, 95, ?, 'digital')`,
                    [
                        deal.title, 
                        'Envato Premium', 
                        parseFloat(deal.price), 
                        parseFloat(deal.price),
                        affiliateUrl, 
                        deal.thumbnail
                    ]
                );
                results.push(`Saved Deal ID: ${result.insertId} - ${deal.title}`);
            }
            
            return JSON.stringify({ 
                success: true, 
                message: `Successfully pushed ${results.length} digital assets into the Deal database!`,
                logs: results 
            });
        } catch (error) {
            console.error(error);
            return JSON.stringify({ error: `Database error: ${error.message}` });
        } finally {
            if (connection) await connection.end();
        }
    },
    {
        name: 'save_envato_digital_assets',
        description: "Takes an array of approved top-selling Envato digital assets and pushes them directly to the storefront database as 'approved' premium deals.",
        schema: z.object({
            deals: z.array(z.object({
                title: z.string().describe("The name of the software or theme"),
                price: z.number().describe("The retail price of the asset"),
                url: z.string().describe("The raw envato URL"),
                thumbnail: z.string().describe("The thumbnail image URL")
            })).describe("Array of digital assets to promote.")
        }),
    }
);
