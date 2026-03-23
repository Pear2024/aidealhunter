require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testSora() {
    console.log("🚀 Testing Sora Video Gen API...");
    try {
        const response = await axios.post('https://api.openai.com/v1/videos/generations', {
            model: "sora", // or sora-2
            prompt: "A cinematic cinematic slow-motion pan of a beautiful shiny metallic water bottle on a marble countertop, highly detailed, photorealistic 4k.",
            size: "720x1280", // Vertical
            duration: 4
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ SUCCESS /v1/videos/generations:", response.data);
    } catch (e) {
        console.error("❌ ERROR /v1/videos/generations:", e.response ? e.response.data : e.message);
        
        console.log("🔄 Trying fallback schema /v1/videos...");
        try {
             const fallback = await axios.post('https://api.openai.com/v1/videos', {
                 model: "sora",
                 prompt: "Cinematic close up of a sparkling water bottle."
             }, {
                 headers: {
                     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                     'Content-Type': 'application/json'
                 }
             });
             console.log("✅ SUCCESS /v1/videos:", fallback.data);
        } catch(fallbackErr) {
             console.error("❌ ERROR /v1/videos:", fallbackErr.response ? fallbackErr.response.data : fallbackErr.message);
        }
    }
}
testSora();
