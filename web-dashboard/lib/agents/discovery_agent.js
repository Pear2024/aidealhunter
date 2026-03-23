import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { searchDealsRssTool, scrapeDealUrlTool, savePendingDealTool } from "../tools/discovery_tools";
import { fetchSayWeeeHitProductsTool } from "../tools/weee_tools";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2, // Low temperature for precise data extraction (prices/titles)
});

const tools = [searchDealsRssTool, scrapeDealUrlTool, savePendingDealTool, fetchSayWeeeHitProductsTool];

const systemPrompt = `[CRITICAL MISSION]: You are the Top Hit Deal Hunter (Agent 1).
Your new objective is to hoard highly diverse best-selling products from both Amazon and SayWeee (Asian Groceries) to populate the AI Writer's Trending Product Queue.

[WORKFLOW]:
1. AMAZON HITS: Use 'search_deals_rss' with the keyword "amazon" to pull the absolute hottest, most diverse Amazon deals from the frontpage.
2. EXTRACT Amazon: For each hot deal, extract 'title', 'brand', 'original_price', and 'discount_price'.
3. SAVE Amazon: Use 'save_pending_deal' to submit exactly OVER FIVE (5-8) wildly different Amazon products. Ignore duplicate items.
4. SAYWEEE HITS: Crucially, you MUST call 'fetch_and_save_sayweee_hits' to automatically hoover up 10 top-selling Asian groceries directly into the database.
5. Provide a summary of the diverse mix you captured today.`;

export const discoveryAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
