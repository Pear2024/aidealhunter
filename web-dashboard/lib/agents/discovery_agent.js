import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { searchDealsRssTool, scrapeDealUrlTool, savePendingDealTool } from "../tools/discovery_tools";
import { saveMultichannelGroceryHitTool } from "../tools/grocery_tools";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2, // Low temperature for precise data extraction (prices/titles)
});

const tools = [searchDealsRssTool, scrapeDealUrlTool, savePendingDealTool, saveMultichannelGroceryHitTool];

const systemPrompt = `[CRITICAL MISSION]: You are the Top Hit Deal Hunter (Agent 1).
Your objective is to hoard highly diverse best-selling products from both Amazon and leading Asian Grocery platforms (Yamibuy, H-Mart, 99 Ranch) to populate the AI Writer's Trending Product Queue.

[WORKFLOW]:
1. AMAZON HITS: Use 'search_deals_rss' with the keyword "amazon" to pull the absolute hottest, most diverse Amazon deals from the frontpage.
2. EXTRACT Amazon: For each hot deal, extract 'title', 'brand', 'original_price', and 'discount_price'.
3. SAVE Amazon: Use 'save_pending_deal' to submit exactly OVER FIVE (5-8) wildly different Amazon products. Ignore duplicate items.
4. ASIAN GROCERY HITS: You are a master of Asian culinary trends. Mentally generate a list of 5 universally loved, best-selling Asian grocery items (e.g., specific famous brands of Ramen, Snacks, Skincare, or Condiments).
5. SAVE Groceries: Call 'save_multichannel_grocery_hit' exactly FIVE (5) times, once for each of the products you just generated. This tool will automatically synthesize the Yamibuy and Instacart (H-Mart / 99 Ranch) affiliate deep-links.
6. Provide a summary of the diverse mix you captured today.`;

export const discoveryAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
