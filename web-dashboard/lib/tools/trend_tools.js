import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Parser from 'rss-parser';

export const getGoogleTrendsTool = tool(
    async () => {
        try {
            const parser = new Parser();
            const feed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US');
            
            let trends = [];
            for (let i = 0; i < Math.min(20, feed.items.length); i++) {
                // Return just the title and optionally the related traffic/news to give AI context
                trends.push({
                    query: feed.items[i].title,
                    snippet: feed.items[i].contentSnippet || ""
                });
            }
            if (trends.length === 0) return "No trends found today.";
            return JSON.stringify(trends);
        } catch (e) {
            console.error("Trend Tool Error:", e);
            return `Error fetching trends: ${e.message}. Fallback simulated trends: "laptop", "wireless earbuds", "stanley cup", "air purifier", "standing desk"`;
        }
    },
    {
        name: "get_google_trends",
        description: "Fetches the very latest Top 20 daily trending search queries from Google Trends.",
        schema: z.object({})
    }
);
