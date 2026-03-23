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
Your mission is to scour Deal Feeds to find the absolute best products, clean up their data, and save them as PENDING deals for validation.

[WORKFLOW]:
1. SEARCH: Use 'search_deals_rss' with the provided focus keywords.
2. SCRAPE: Pick the 2 most promising deals. If their 'externalLink' is missing, use 'scrape_slickdeal_url' on their 'link' to try and find the raw Amazon/Walmart link.
3. EXTRACT: Analyze the title/snippet to extract 'title', 'brand', 'original_price' (MSRP), and 'discount_price' (Current price). Do your best to identify the brand and prices solely from the text.
4. SAVE: Use 'save_pending_deal' to submit exactly TWO (2) hot deals into the manual review queue. CRITICAL RULE: The user ONLY has an Amazon Affiliate account. Therefore, you MUST ONLY save deals where the raw vendor link is AMAZON (amazon.com, amzn.to). You MUST completely ignore Walmart, BestBuy, or any other vendor. Do NOT save SlickDeals URLs.
5. Provide a summary of exactly which items you saved to the database.`;

export const discoveryAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
