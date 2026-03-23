import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { getConnection } from '@/lib/db';

export const searchDealsRssTool = tool(
  async ({ keyword }) => {
    try {
        const parser = new Parser({ customFields: { item: ['content:encoded'] }});
        const url = `https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=${encodeURIComponent(keyword)}`;
        const feed = await parser.parseURL(url);
        
        let deals = [];
        feed.items.forEach(deal => {
            const html = deal['content:encoded'] || deal.content;
            const $ = cheerio.load(html || '');
            let externalLink = null;
            let imageUrl = $('img').first().attr('src') || null;
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && (href.includes('amazon.com') || href.includes('amzn.to'))) {
                   externalLink = href;
                }
            });
            deals.push({
                title: deal.title,
                link: deal.link, // The slickdeals link
                externalLink: externalLink,
                image_url: imageUrl,
                snippet: deal.contentSnippet?.substring(0, 300)
            });
        });
        return JSON.stringify(deals.slice(0, 5)); // Return top 5 recent hits
    } catch (e) { return `Error searching RSS: ${e.message}`; }
  },
  {
      name: "search_deals_rss",
      description: "Searches popular active deals via RSS for a keyword (e.g., 'ssd', 'apple'). Returns a JSON string of deals with title, link, and external vendor link.",
      schema: z.object({ keyword: z.string().describe("The search keyword") })
  }
);

export const scrapeDealUrlTool = tool(
  async ({ url }) => {
    try {
        const res = await fetch(url, { headers: {'User-Agent': 'Mozilla/5.0'} }); 
        const html = await res.text(); 
        const $ = cheerio.load(html); 
        let rawVendorUrl = null; 
        $('a').each((i, el) => { 
            const href = $(el).attr('href'); 
            if (href && href.includes('u2=')) { 
                const decoded = decodeURIComponent(href.split('u2=')[1]);
                if (decoded.includes('amazon.com') || decoded.includes('amzn.to')) {
                    rawVendorUrl = decoded;
                }
            } 
        }); 
        return rawVendorUrl || "No external vendor link found on that page.";
    } catch (e) { return `Error scraping: ${e.message}`; }
  },
  {
      name: "scrape_slickdeal_url",
      description: "Scrapes a specific SlickDeals URL to find the underlying external vendor link (like Amazon) if it wasn't already present.",
      schema: z.object({ url: z.string().describe("The SlickDeals URL to scrape") })
  }
);

export const savePendingDealTool = tool(
  async ({ title, brand, original_price, discount_price, url }) => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute('SELECT id FROM normalized_deals WHERE url = ?', [url]);
        if (rows.length > 0) {
            await connection.end();
            return "DUPLICATE: Deal already exists in database.";
        }

        await connection.execute(
            `INSERT INTO normalized_deals (
                title, brand, original_price, discount_price, 
                url, status, submitter_id, vote_score, merchandiser_score, image_url
            ) VALUES (?, ?, ?, ?, ?, 'pending', 'agent_discovery', 0, 85, ?)`,
            [title, brand || 'Unknown', original_price || null, discount_price, url, image_url]
        );
        await connection.end();
        return "SUCCESS: Deal saved to the manual validation queue. Awaiting human or gatekeeper approval.";
    } catch (e) { return `Database Insert Error: ${e.message}`; }
  },
  {
      name: "save_pending_deal",
      description: "Saves a hot deal into the database AS PENDING so the user can review it on the Kanban board. NEVER save duplicate urls. Url must be the Vendor link.",
      schema: z.object({
          title: z.string().describe("Cleaned Product Title"),
          brand: z.string().describe("The Brand name (if known, else 'Unknown')"),
          original_price: z.number().nullable().describe("The original MSRP price before discount. If unknown, pass null."),
          discount_price: z.number().describe("The current discounted price"),
          url: z.string().describe("The EXTERNAL vendor URL (e.g., Amazon link), NOT the Slickdeals link"),
          image_url: z.string().optional().describe("The thumbnail image URL for the product, extracted from the RSS feed.")
      })
  }
);
