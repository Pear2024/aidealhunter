const axios = require('axios');

async function probeSora() {
    console.log("🎬 Initiating Cloud API Probe for OpenAI Sora Video Generation...");
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    
    if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
        console.error("❌ CRITICAL ERROR: OPENAI_API_KEY secret is totally missing or invalid in GitHub Actions!");
        process.exit(1);
    }

    const payload = {
        model: "sora-2", // Updated based on cloud telemetry
        prompt: "A breathtaking, hyper-realistic cinematic tracking shot of an expansive futuristic city bathed in golden hour neon light. Shallow depth of field, 4k resolution."
    };

    console.log(`🧠 Formulated Prompt payload: "${payload.prompt}"`);

    // Probe 1: Standard /v1/videos
    try {
        console.log("\n📡 Probe [A]: POST https://api.openai.com/v1/videos");
        const resA = await axios.post('https://api.openai.com/v1/videos', payload, {
            headers: { 
                'Authorization': `Bearer ${OPENAI_API_KEY}`, 
                'Content-Type': 'application/json' 
            }
        });
        console.log("✅ SUCCESS Probe [A]!", JSON.stringify(resA.data, null, 2));
        process.exit(0);
    } catch (e1) {
        console.error("❌ Probe [A] Failed. Response Payload:", e1.response ? JSON.stringify(e1.response.data, null, 2) : e1.message);
        
        // Probe 2: Alternative /v1/videos/generations
        console.log("\n📡 Probe [B]: POST https://api.openai.com/v1/videos/generations");
        try {
            const resB = await axios.post('https://api.openai.com/v1/videos/generations', payload, {
                headers: { 
                    'Authorization': `Bearer ${OPENAI_API_KEY}`, 
                    'Content-Type': 'application/json' 
                }
            });
            console.log("✅ SUCCESS Probe [B]!", JSON.stringify(resB.data, null, 2));
            process.exit(0);
        } catch (e2) {
            console.error("❌ Probe [B] Failed. Response Payload:", e2.response ? JSON.stringify(e2.response.data, null, 2) : e2.message);
            console.log("\n⚠️ BOTH endpoints failed. This indicates the precise Sora endpoint requires a specific beta header, or the account lacks video generation permissions.");
            process.exit(1);
        }
    }
}

probeSora();
