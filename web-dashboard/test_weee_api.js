const https = require('https');

async function testWeeeAPI() {
    try {
        console.log("Attempting to fetch SayWeee API...");
        
        // SayWeee uses a GraphQL / JSON API for its frontend. 
        // We can mimic a generic search request or category fetch.
        // Let's try grabbing their featured/bestseller category via an often-used endpoint or just scraping the nextjs props.
        
        const res = await fetch("https://www.sayweee.com/en/bestsellers", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        
        const html = await res.text();
        
        // The HTML contains a giant __NEXT_DATA__ JSON blob. Let's parse it!
        const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        
        if (scriptMatch && scriptMatch[1]) {
            const nextData = JSON.parse(scriptMatch[1]);
            // Search through the JSON for products
            console.log("Successfully intercepted __NEXT_DATA__ JSON!");
            
            // Try to find products anywhere in the props
            let products = [];
            
            // Recursive search function to find objects that look like products
            function findProducts(obj) {
                if (!obj || typeof obj !== 'object') return;
                
                if (obj.product_id && obj.title && obj.base_price) {
                    products.push({
                        title: obj.title.en || obj.title.zh || obj.title,
                        price: obj.base_price,
                        url: `https://www.sayweee.com/en/product/${obj.product_id}`,
                        image: obj.image_url || obj.image
                    });
                } else if (Array.isArray(obj)) {
                    obj.forEach(findProducts);
                } else {
                    Object.values(obj).forEach(findProducts);
                }
            }
            
            findProducts(nextData.props || nextData);
            
            // Deduplicate by URL
            const uniqueProducts = [];
            const urls = new Set();
            for (const p of products) {
                if (!urls.has(p.url)) {
                    urls.add(p.url);
                    uniqueProducts.push(p);
                }
            }
            
            console.log(`Found ${uniqueProducts.length} unique products in the raw JSON state!`);
            console.log("Top 10:");
            console.log(JSON.stringify(uniqueProducts.slice(0, 10), null, 2));
        } else {
            console.log("Could not find __NEXT_DATA__. They might not be using Next.js pages router anymore or blocked us.");
            // Let's print out what we did get
            console.log("HTML Preview:", html.substring(0, 500));
        }
        
    } catch(e) {
        console.error("Error:", e);
    }
}

testWeeeAPI();
