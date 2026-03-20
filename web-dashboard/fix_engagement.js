const fs = require('fs');

const file = '/Users/pear/Documents/AntiGravity/Ai news/AI_Deal_Hunter/web-dashboard/app/api/cron/engagement/route.js';
let content = fs.readFileSync(file, 'utf8');

// The image list and logic
const imageLogic = `
        // Pick a random aesthetic shopping image
        const aestheticImages = [
            "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop", // Shopping bags
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop", // Credit card / cart
            "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1200&auto=format&fit=crop", // Shopping cart full
            "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop", // Sale sign
            "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200&auto=format&fit=crop"  // aesthetic store/boxes
        ];
        const randomImage = aestheticImages[Math.floor(Math.random() * aestheticImages.length)];
`;

// Replace the FB output logic
content = content.replace(
    /\/\/ 4\. Publish to Facebook[\s\S]*?(?=const fbResult)/,
    `// 4. Attach Random Image & Publish to Facebook
        const aestheticImages = [
            "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop", 
            "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200&auto=format&fit=crop"  
        ];
        const randomImage = aestheticImages[Math.floor(Math.random() * aestheticImages.length)];

        // We use /photos endpoint instead of /feed to make it a Native Photo Post
        const fbResponse = await fetch(\`https://graph.facebook.com/v19.0/\${process.env.FB_PAGE_ID}/photos?access_token=\${process.env.FB_PAGE_ACCESS_TOKEN}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: generatedText,
                url: randomImage
            })
        });
        `
);

fs.writeFileSync(file, content);
console.log("Updated API Route");
