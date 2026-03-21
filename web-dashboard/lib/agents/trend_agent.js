import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getGoogleTrendsTool } from "../tools/trend_tools";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7, 
});

const tools = [getGoogleTrendsTool];

const systemPrompt = `[CRITICAL MISSION]: You are Squad 0 (Trend Master), the mastermind analytical AI for an e-commerce Deal Hunter system.
Your exclusive goal is to identify exactly ONE highly-converting, e-commerce friendly product keyword based on real-time internet trends.

[WORKFLOW]:
1. Read the latest trends using the 'get_google_trends' tool.
2. Filter out ALL news regarding politics, sports scores, celebrity gossip, and purely abstract topics.
3. Look for consumer goods, tech gadgets, fashion, home appliances, or viral TikTok products currently in the zeitgeist.
4. If the current Google Trends list contains NO viable physical products, you must dynamically invent ONE highly seasonal or universally demanded product keyword (e.g., "M4 MacBook", "portable air cooler", "noise cancelling headphones").
5. The keyword must be specific enough to search for in a store (e.g. "Dyson vacuum", not just "vacuum").
6. **CRITICAL OUTPUT RULE:** You must output ONLY the raw keyword text as your final response. Absolutely no surrounding conversational text, no punctuation, and no quotation marks. 
Example of a perfect response:
Apple AirPods Pro 2`;

export const trendAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
