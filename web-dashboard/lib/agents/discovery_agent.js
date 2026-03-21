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
Your mission is to scour Deal Feeds to find the absolute best products, clean up their data, and save them for Review.

[WORKFLOW]:
1. SEARCH: Use 'search_deals_rss' with the provided focus keywords.
2. SCRAPE: Pick the 2 most promising deals. If their 'externalLink' is missing, use 'scrape_slickdeal_url' on their 'link' to try and find the raw Amazon/Walmart link.
3. EXTRACT: Analyze the title/snippet to extract 'title', 'brand', 'original_price' (MSRP), and 'discount_price' (Current price). Do your best to identify the brand and prices solely from the text.
4. SAVE: Use 'save_pending_deal' to submit exactly TWO (2) hot deals into the system. DO NOT save SlickDeals URLs; you MUST save the raw vendor URL (Amazon, Walmart, BestBuy, etc). If you can't find a vendor URL, skip that deal.
5. Provide a summary of exactly which items you saved to the database.`;

export const discoveryAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
