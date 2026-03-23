import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as cheerio from 'cheerio';
import { getConnection } from '@/lib/db';

export const fetchSayWeeeHitProductsTool = tool(
  async () => {
    try {
        console.log("Fetching SayWeee Hit Products...");
        // SayWeee categorizes their main page with various popular items.
        // Rather than scraping the SPA, we will fetch a known sitemap chunk or popular items page.
        const res = await fetch("https://www.sayweee.com/en/bestsellers", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
        });
        
        const html = await res.text();
        const $ = cheerio.load(html);
        
        let products = [];
        
        // Find product links in the HTML
        $('a[href*="/en/product/"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && !products.includes(href)) {
                products.push(href.startsWith('http') ? href : `https://www.sayweee.com${href}`);
            }
        });

        // Filter valid links and shuffle them
        products = products.filter(url => url.includes('/product/')).sort(() => 0.5 - Math.random());
        const selectedUrls = products.slice(0, 10);
        
        let scrapedDeals = [];
        for (const url of selectedUrls) {
            try {
                // Same logic as our manual scrape-weee route
                const prodRes = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const prodHtml = await prodRes.text();
                const $p = cheerio.load(prodHtml);
                
                const title = $p('meta[property="og:title"]').attr('content') || $p('title').text();
                const image = $p('meta[property="og:image"]').attr('content') || '';
                
                let price = null;
                let original_price = null;
                const ldJson = $p('script[type="application/ld+json"]').html();
                if(ldJson) {
                    try {
                        const schema = JSON.parse(ldJson);
                        if(schema.offers && schema.offers.price) {
                             price = parseFloat(schema.offers.price);
                        }
                    } catch(e) {}
                }

                const cleanTitle = title.split(' - ')[0].replace(' | Weee!', '').replace(' | Buy Asian Groceries & Food', '').trim();
                
                if (cleanTitle && price) {
                    const connection = await getConnection();
                    try {
                        const [rows] = await connection.execute('SELECT id FROM normalized_deals WHERE url = ?', [url]);
                        if (rows.length === 0) {
                            await connection.execute(
                                `INSERT INTO normalized_deals (
                                    title, brand, original_price, discount_price, 
                                    url, status, submitter_id, vote_score, merchandiser_score, image_url
                                ) VALUES (?, ?, ?, ?, ?, 'pending', 'agent_weee_hunter', 0, 85, ?)`,
                                [cleanTitle, 'SayWeee', null, price, url, image]
                            );
                            scrapedDeals.push(cleanTitle);
                        }
                    } finally {
                        await connection.end();
                    }
                }
            } catch (err) {
                console.error("Error scraping individual Weee product:", err);
            }
        }

        return `SUCCESS: Scraped and saved ${scrapedDeals.length} hit Asian groceries to the Queue Board. Titles: ${scrapedDeals.join(', ')}`;
    } catch (e) { 
        return `Error fetching SayWeee products: ${e.message}`; 
    }
  },
  {
      name: "fetch_and_save_sayweee_hits",
      description: "Directly scrapes SayWeee Bestsellers to find up to 10 hit Asian grocery products and saves them silently into the database.",
      schema: z.object({})
  }
);
