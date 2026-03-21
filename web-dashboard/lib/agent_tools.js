import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getConnection } from '@/lib/db';
import crypto from 'crypto';
import { sendTelegramAlert } from '@/lib/telegram';

// Tool 1: Fetch Recent AI News (Using Google News RSS as the source for now to keep it free and simple)
export const fetchAiNewsTool = tool(
  async ({ query }) => {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(url, { next: { revalidate: 0 } });
        const xmlText = await response.text();
        
        const urlRegex = new RegExp("<item>([\\s\\S]*?)<\\/item>", "g");
        const itemMatches = xmlText.match(urlRegex) || [];
        
        let items = [];
        for (let i = 0; i < Math.min(itemMatches.length, 12); i++) {
            const itemXml = itemMatches[i];
            const titleMatch = itemXml.match(/<title>([^<]+)/);
            const linkMatch = itemXml.match(/<link>([^<]+)/);
            const pubDateMatch = itemXml.match(/<pubDate>([^<]+)/);
            
            if (titleMatch && linkMatch) {
                items.push({
                    title: titleMatch[1].trim(),
                    link: linkMatch[1].trim(),
                    date: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString()
                });
            }
        }
        return JSON.stringify(items);
    } catch (e) {
        return `Error fetching news: ${e.message}`;
    }
  },
  {
    name: "fetch_recent_ai_news",
    description: "Fetches the latest news articles from Google News RSS based on a search query. Returns a JSON string of articles with title, link, and date. Note: Google RSS search doesn't natively support strictly 'last 24h' via normal query if formatted as URL, but you can pass operators like 'when:1d' in the query.",
    schema: z.object({
      query: z.string().describe("The search query, e.g., 'Artificial Intelligence OR ChatGPT when:1d'"),
    }),
  }
);

// Tool 2: Check Database for Duplicates
export const checkDatabaseDuplicateTool = tool(
  async ({ url }) => {
    try {
        const connection = await getConnection();
        const urlHash = crypto.createHash('sha256').update(url).digest('hex');
        const [rows] = await connection.execute('SELECT id FROM sent_ai_news WHERE url_hash = ?', [urlHash]);
        
        if (rows.length > 0) {
            return `DUPLICATE: The article with URL ${url} was already processed and sent previously.`;
        }
        return `NEW: This article has not been processed yet. You can process it.`;
    } catch (e) {
        return `Error checking database: ${e.message}`;
    }
  },
  {
    name: "check_database_duplicate",
    description: "Checks if a given news URL has already been processed and sent to avoiding duplicates.",
    schema: z.object({
      url: z.string().describe("The full URL of the news article to check"),
    }),
  }
);

// Tool 3: Mark Article as Read
export const markArticleReadTool = tool(
  async ({ url, title }) => {
    try {
        const connection = await getConnection();
        const urlHash = crypto.createHash('sha256').update(url).digest('hex');
        await connection.execute('INSERT IGNORE INTO sent_ai_news (url_hash, title) VALUES (?, ?)', [urlHash, title.substring(0, 1000)]);
        return "SUCCESS: Article marked as read in the database.";
    } catch (e) {
        return `Error marking article as read: ${e.message}`;
    }
  },
  {
    name: "mark_article_as_read",
    description: "Saves the article URL to the database to prevent it from being processed again in the future. ALWAYS call this after deciding to use an article for your final output.",
    schema: z.object({
      url: z.string().describe("The full URL of the news article"),
      title: z.string().describe("The title of the news article"),
    }),
  }
);

// Tool 4: Send Telegram Message
export const sendTelegramTool = tool(
  async ({ message }) => {
    try {
        let finalMessage = message;
        
        // Convert any rogue markdown bold bounds if AI forgets
        finalMessage = finalMessage.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        // Extract and shorten Google News URLs
        const urlExtractRegex = new RegExp("https?:\\/\\/[^\\s\\\"'<>\\]]+", "g");
        const extractedUrls = finalMessage.match(urlExtractRegex) || [];
        for (const longUrl of extractedUrls) {
             if (longUrl.includes('is.gd')) continue;
             try {
                 const shortRes = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`);
                 const shortData = await shortRes.json();
                 if (shortData.shorturl) {
                     finalMessage = finalMessage.replace(longUrl, shortData.shorturl);
                 }
             } catch (e) {}
        }

        await sendTelegramAlert(finalMessage);
        return "SUCCESS: Message sent to Telegram.";
    } catch (e) {
        return `Error sending telegram message: ${e.message}`;
    }
  },
  {
    name: "send_telegram_message",
    description: "Sends a formatted text message to the user's Telegram channel.",
    schema: z.object({
      message: z.string().describe("The text message to send to Telegram. Support basic Markdown/Emojis formatting."),
    }),
  }
);
