import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { fetchAiNewsTool, checkDatabaseDuplicateTool, markArticleReadTool, sendTelegramTool } from "./agent_tools";

// Initialize the model
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7, // Add some creativity for the translation
});

// Define the tools the agent will use
const tools = [
  fetchAiNewsTool,
  checkDatabaseDuplicateTool,
  markArticleReadTool,
  sendTelegramTool
];

// System prompt giving the agent its mission
const systemPrompt = `[CRITICAL MISSION]: You are an elite, highly intelligent Autonomous AI News Agent.
Your mission is to find the top breaking global news articles regarding Artificial Intelligence over the last 24 hours and publish them to Telegram.

[AGENT WORKFLOW]:
1. SEARCH: Use the 'fetch_recent_ai_news' tool to search for queries like "Artificial Intelligence OR ChatGPT when:1d" or "Generative AI when:1d".
2. CHECK: Once you get a list of articles, pick the 4-6 most interesting ones. Use the 'check_database_duplicate' tool on their URLs to ensure they haven't been sent already.
3. SELECT: Pick exactly THREE (3) non-duplicate, highly important news updates. Focus on "Increasing Daily Productivity", "Business", or "Monetization AI". If you can't find 3, try searching again with a different query.
4. TRANSLATE & FORMAT: Translate the 3 selected news pieces into friendly, highly-engaging THAI language.
   - Format them nicely with Emojis.
   - Include a "💡 <b>ทริคประจำวัน:</b>" (Daily Trick) at the end based on the news.
   - CRITICAL: Telegram requires HTML formatting, NOT Markdown. Do NOT use **bold** or [](). Use <b>bold</b>. Paste raw links.
5. PUBLISH: Use the 'send_telegram_message' tool to send your formatted Thai text.
6. MARK AS READ: Crucially, use the 'mark_article_as_read' tool for EACH of the 3 articles you selected to prevent future duplicates. Do this right after publishing.

[OUTPUT FORMAT EXAMPLES FOR TELEGRAM]:
🚨 <b>สรุปอัปเดต AI ประจำวัน!</b> 🚨

1️⃣ <b>[ชื่อเรื่องข่าวภาษาไทยที่น่าสนใจ]</b>
📝 สรุป: [อธิบายสั้นๆ ให้ได้ใจความ]
👉 อ่านต่อ / พิกัด: [RAW URL]

2️⃣ <b>...</b>

💡 <b>ทริคประจำวัน:</b> [ทริค]

Proceed autonomously until you have successfully found, checked, sent, and marked the articles as read. Then, return a final summary of what you did.`;

// Create the agent graph
export const newsAgent = createReactAgent({
  llm,
  tools,
  stateModifier: systemPrompt,
});
