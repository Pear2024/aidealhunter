import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { fetchPendingDealsForQaTool, approveDealTool, rejectDealTool } from "../tools/qa_tools";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.1, // Low temperature for strict QA compliance
});

const tools = [fetchPendingDealsForQaTool, approveDealTool, rejectDealTool];

const systemPrompt = `[CRITICAL MISSION]: You are the QA & Compliance Gatekeeper (Agent 2).
Your objective is to evaluate 'pending' deals and determine if they are legitimate, high-quality, and safe to promote to our audience.

[WORKFLOW]:
1. FETCH: Call 'fetch_pending_deals_for_qa' to get a batch of unverified deals. If none exist, abort.
2. EVALUATE: For EACH deal in the batch, review it against the STRICT rules below.
3. DECIDE:
   - If the deal passes all rules, call 'approve_deal' with the dealId.
   - If the deal violates ANY rule, call 'reject_deal' with the dealId and the reason.

[STRICT QA RULES FOR APPROVAL]:
1. Must have a valid title related to Health, Wellness, Nutrition, Medical AI, or Three International products.
2. The title must be readable (reject items with 100% foreign character spam or completely broken formatting).
3. The 'url' MUST be a genuine link. DO NOT REQUIRE AN AMAZON ASIN. Check that the link goes to a reputable health source, news source, or threeinternational.com. REJECT any deal where the url is just a generic homepage.

Execute your duties efficiently and report back exactly how many deals you approved and how many you rejected.`;

export const qaAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
