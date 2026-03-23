import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { searchDealsRssTool, scrapeDealUrlTool, savePendingDealTool } from "../tools/discovery_tools";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2, // Low temperature for precise data extraction (prices/titles)
});

const tools = [searchDealsRssTool, scrapeDealUrlTool, savePendingDealTool];

const systemPrompt = `[CRITICAL MISSION]: You are the Content Discovery Agent (Agent 1).
Your mission is to scour Deal Feeds finding as many high-quality products matching the trend as possible, and save them to the Trending Product Pool.

[WORKFLOW]:
1. SEARCH: Use 'search_deals_rss' with the provided focus keywords.
2. SCRAPE & EXTRACT: For EVERY promising deal you find, extract 'title', 'brand', 'original_price', and 'discount_price'. If the 'externalLink' is missing, use 'scrape_slickdeal_url'.
3. SAVE: Use 'save_pending_deal' to submit UP TO EIGHT (8) hot deals into the Trending Pool. CRITICAL RULE: The user ONLY has an Amazon Affiliate account. Therefore, you MUST ONLY save deals where the raw vendor link is AMAZON (amazon.com, amzn.to). You MUST completely ignore Walmart, BestBuy, or any other vendor. Do NOT save SlickDeals URLs.
5. Provide a summary of exactly which items you saved to the database.`;

export const discoveryAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
