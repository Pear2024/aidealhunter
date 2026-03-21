require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

async function test() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, port: process.env.MYSQL_PORT
    });

    const parser = new Parser({ 
        customFields: { item: ['media:content', 'image'] },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const CATEGORIES = ['food', 'household', 'tech', 'travel'];
    const randomCategory = CATEGORIES[1]; 
    const url = `https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=${randomCategory}`;
    
    let feed = await parser.parseURL(url);
    const items = feed.items.slice(0, 20);

    for (const deal of items) {
        if (!deal.title.toLowerCase().includes('amazon')) continue;
        console.log("Found Amazon Deal:", deal.title);

        let extracted = { should_approve: false, discount_price: null };
        try {
            const priceMatch = deal.title.match(/\$([0-9,.]+)/);
            if (priceMatch) {
                extracted.discount_price = parseFloat(priceMatch[1].replace(/,/g, ''));
                extracted.title = deal.title.replace(/\$([0-9,.]+)/, '').trim();
                extracted.should_approve = true;
            }
        } catch(e) {}
        
        let finalUrl = deal.link;
        try {
            const sdRes = await fetch(deal.link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const sdHtml = await sdRes.text();
            const $sd = cheerio.load(sdHtml);
            $sd('a').each((i, el) => {
                const href = $sd(el).attr('href');
                if (href && href.includes('u2=')) {
                    const decoded = decodeURIComponent(href.split('u2=')[1]);
                    if (decoded.includes('amazon.com')) finalUrl = decoded;
                }
            });
        } catch(e) {}

        console.log("Ready to Post:", extracted.title, "Price:", extracted.discount_price, finalUrl);

        try {
            let trackingLink = finalUrl;
            const copywriterPrompt = `Act as an elite $1000/day social media copywriter. Write a highly engaging, "thumb-stopping" Facebook post caption for a deal.\nDeal Title: ${extracted.title}\nPrice: $${extracted.discount_price}\nRules: MUST BE IN ENGLISH. Target audience: Residents of Hemet, California and the Inland Empire. Keep it concise (3 sentences max). Sound like a helpful neighbor. Use 2-3 emojis. NO links in body. Do NOT include #Ad hashtags. End with a strong English call to action.`;
            console.log("Calling Gemini...");
            const copyResult = await textModel.generateContent(copywriterPrompt);
            let caption = `${copyResult.response.text().trim()}\n\n🛒 Grab Deal Here: ${trackingLink}`;
            console.log("Caption Generated:\n", caption);
            
            const fbEndpoint = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`;
            console.log("Calling FB Graph API...");
            const fbResponse = await fetch(`${fbEndpoint}?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: caption, link: trackingLink })
            });
            const fbResult = await fbResponse.json();
            console.log("FB Graph Response:", fbResult);
            
        } catch(err) {
            console.error("Crash during FB Post logic:", err);
        }
        break; // just test one
    }
    await connection.end();
}
test();
