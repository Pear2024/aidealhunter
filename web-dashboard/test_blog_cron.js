require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT || 25060,
        });

        const [deals] = await connection.execute(
            `SELECT * FROM normalized_deals WHERE status = 'approved' AND api_provider = 'Amazon' AND (discount_price > 0 OR original_price > discount_price) ORDER BY profit_score DESC, merchandiser_score DESC LIMIT 20`
        );
        
        if (deals.length === 0) {
            console.log("No deals found.");
            return;
        }

        const deal = deals[Math.floor(Math.random() * deals.length)];
        
        const affiliateTag = process.env.AMAZON_AFFILIATE_TAG || 'pear2024-20';
        const dealUrl = deal.url || '';
        const affiliateUrl = dealUrl.includes('?') ? `${dealUrl}&tag=${affiliateTag}` : `${dealUrl}?tag=${affiliateTag}`;

        console.log("Selected deal:", deal.title);

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const schema = {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "The Incredibly Catchy Title (Under 60 chars) focusing on the product/deal" },
            slug: { type: "STRING" },
            content_html: { type: "STRING", description: "Pure HTML strictly wrapped in <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. MUST INCLUDE the CTA button." },
          },
          required: ["title", "slug", "content_html"],
        };

        const textModel = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { 
                responseMimeType: "application/json",
                // Notice responseSchema is commented out to see if it's the schema that breaks it
                responseSchema: schema 
            }
        });

        const prompt = `Task: Write a highly engaging SEO blog post specifically targeting residents of the Inland Empire and Hemet, California. 
        The core objective is to seamlessly REVIEW and RECOMMEND a specific high-profit Amazon product.
        PRODUCT DETAILS:
        - Title: ${deal.title}
        - Price: $${deal.discount_price}
        - Affiliate Link: ${affiliateUrl}
        
        OUTPUT FORMAT: JSON.`;

        console.log("Calling Gemini...");
        const genResult = await textModel.generateContent(prompt);
        let rawJson = genResult.response.text().trim();
        console.log("Raw JSON:", rawJson.substring(0, 100));
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const blogData = JSON.parse(rawJson);
        const slug = blogData.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        const imageUrl = deal.image_url;

        console.log("Successfully generated:", blogData.title);
        
    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        if (connection) await connection.end();
    }
}
test();
