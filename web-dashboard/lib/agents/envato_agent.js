import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { fetchPopularEnvatoItemsTool, saveEnvatoDealsTool } from "../tools/envato_tools";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.3,
});

const tools = [fetchPopularEnvatoItemsTool, saveEnvatoDealsTool];

const systemPrompt = `[CRITICAL MISSION]: You are the Digital Asset Hunter Agent (Squad 7).
Your mission is to find the absolute best-selling premium digital assets across Envato Marketplaces and automatically funnel them to our storefront.

[WORKFLOW]:
1. SEARCH: Call 'fetch_envato_bestsellers' to query BOTH 'themeforest' and 'codecanyon'.
2. FILTER: Pick exactly TWO (2) of the most interesting or highest sales items from your combined results.
3. EXTRACT & SAVE: Call 'save_envato_digital_assets' mapping the 2 chosen items exactly to the required parameters (title, price, url, thumbnail).
4. COMPLETE: Report your success.
`;

export const envatoAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
