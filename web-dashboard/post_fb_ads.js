require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const AIMLAPI_KEY = process.env.AIMLAPI_KEY;

const ads = [
    {
        name: "Angle 1: Anti-Aging & Cellular Health",
        imagePrompt: "A highly aesthetic, cinematic photorealistic image showing glowing, vibrant, futuristic healthy biological cells. Glowing blue and warm gold lighting, representing youth and vitality. 8k resolution, deeply scientific yet beautiful.",
        copy: `🧬 Your real age might be 40... but is your 'Cellular Age' actually 55?

Are you constantly battling chronic fatigue, brain fog, or stubborn weight that won't budge? Standard blood tests often miss the root cause. 

Stop guessing and let science give you the answers. Discover your hidden health risks and uncover your personalized longevity roadmap with the Nadania Medical AI Engine. It takes just 3 minutes to evaluate your cellular vitality.

👉 Get your FREE AI Health Assessment now: https://nadaniadigitalllc.com/wellness

*(Disclaimer: This preliminary AI analysis does not replace professional medical diagnosis.)*`
    },
    {
        name: "Angle 2: Busy Professionals / Mystery Symptoms",
        imagePrompt: "A sleek, cinematic, photorealistic image of a modern smartphone displaying a glowing, futuristic medical AI health scanning dashboard. Dimly lit elegant office background, hi-tech medical concept. 8k.",
        copy: `🚨 Don't let constant fatigue and body aches become your "new normal."

Too busy for a full hospital check-up? Scared of what you might find, but ignoring the warning signs your body is giving you? Check your health instantly from the palm of your hand.

Meet your new personal health assistant. The Nadania Medical AI cross-references your daily symptoms and lifestyle against thousands of clinical studies to map out your exact health risks.

Take control of your wellbeing today before minor symptoms turn into chronic illness.

👉 Start your FREE Instant Medical AI Scan: https://nadaniadigitalllc.com/wellness

*(Disclaimer: This preliminary AI analysis does not replace professional medical diagnosis.)*`
    },
    {
        name: "Angle 3: Biohacker / Future of Medicine",
        imagePrompt: "A futuristic, ultra-modern glowing holographic human body scanning interface, highly detailed medical UI, floating data points, cinematic ambient lighting, 8k resolution, advanced biohacking aesthetic.",
        copy: `🦾 Unlock your body's true biological limits with Clinical-Grade AI.

How well do you really know your own biology? Step into the future of precision wellness with the Nadania Medical AI Engine.

Stop wasting money on random vitamins. Our advanced AI analyzes your unique vulnerabilities to build a hyper-personalized cellular recovery and anti-aging blueprint. Optimize your sleep, protect your cells, and outsmart your genetics.

Be the best version of yourself.

👉 Claim your FREE Personalized AI Health Roadmap: https://nadaniadigitalllc.com/wellness

*(Disclaimer: This preliminary AI analysis does not replace professional medical diagnosis.)*`
    }
];

async function generateAndPostAd(adInfo, index) {
    console.log(`\n🚀 Processing [Ad ${index + 1}: ${adInfo.name}]...`);
    try {
        // 1. Generate Ad Creative via DALL-E 3 (Official OpenAI SDK)
        console.log(`🎨 Generating Image via OpenAI...`);
        const imgRes = await axios.post('https://api.openai.com/v1/images/generations', {
            model: "dall-e-3",
            prompt: adInfo.imagePrompt,
            n: 1, size: "1024x1024"
        }, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
        
        const imageUrl = imgRes.data.data[0].url;
        console.log(`✅ Image Ready: ${imageUrl}`);

        // 2. Post to Facebook using Graph API (Pages API for Photos)
        console.log(`📡 Publishing to Facebook Page...`);
        const fbRes = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/photos`, null, {
            params: {
                url: imageUrl,
                message: adInfo.copy,
                access_token: PAGE_TOKEN
            }
        });

        console.log(`🎉 SUCCESS! Ad Posted to Facebook. Post ID: ${fbRes.data.post_id}`);
    } catch (e) {
        console.error(`❌ Error on Ad ${index + 1}:`, e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

async function main() {
    console.log("🔥 Starting A/B Ads Auto-Poster Pipeline...\n");
    for (let i = 0; i < ads.length; i++) {
        await generateAndPostAd(ads[i], i);
        // Add 5 second delay between posts to prevent API rate limiting
        await new Promise(r => setTimeout(r, 5000));
    }
    console.log("\n✅ All 3 Ad Tests Have Been Published to your Facebook Page!");
}

main();
