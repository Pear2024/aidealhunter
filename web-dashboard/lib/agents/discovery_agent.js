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

const systemPrompt = `[CRITICAL MISSION]: You are the Medical AI & Health Discovery Agent.
Your objective is to hoard highly diverse breaking news, clinical studies, and cutting-edge innovations related to Health, Longevity, and Medical AI.

[WORKFLOW]:
1. HEALTH HITS: Mentally generate a list of 3-5 massive paradigm shifts or recent discoveries in health (e.g., Cellular longevity, Liposomal delivery efficiency, AI diagnosing illnesses).
2. For each concept, synthesize a 'Deal' object where the title is an engaging headline about this discovery, and the URL is "https://threeinternational.com" as the ultimate solution platform.
3. SAVE HITS: Use 'save_pending_deal' to submit exactly THREE (3) distinct, highly engaging health-related topics into the pipeline.
4. Provide a summary of the diverse mix you captured today.`;

export const discoveryAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
