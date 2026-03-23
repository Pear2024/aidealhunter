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
        console.log("\\n📡 Probe: POST https://api.openai.com/v1/videos");
        const headers = { 
            'Authorization': `Bearer ${OPENAI_API_KEY}`, 
            'Content-Type': 'application/json' 
        };
        const resA = await axios.post('https://api.openai.com/v1/videos', payload, { headers });
        const videoId = resA.data.id;
        console.log(`✅ SUCCESS! Job created: ${videoId}. Now polling for completion...`);

        let status = resA.data.status;
        let attempts = 0;
        
        while (status === 'queued' || status === 'in_progress') {
            attempts++;
            await new Promise(r => setTimeout(r, 15000)); // wait 15 seconds
            console.log(`⏳ Polling attempt [${attempts}]... Waiting for Sora GPU cluster...`);
            
            const checkRes = await axios.get(`https://api.openai.com/v1/videos/${videoId}`, { headers });
            status = checkRes.data.status;
            
            if (status === 'completed') {
                console.log("\\n🎉 VIDEO COMPLETED! Final Payload:");
                console.log(JSON.stringify(checkRes.data, null, 2));
                break;
            } else if (status === 'failed' || status === 'rejected') {
                console.error("\\n❌ VIDEO GENERATION FAILED:", JSON.stringify(checkRes.data, null, 2));
                process.exit(1);
            }
        }
        process.exit(0);
    } catch (e1) {
        console.error("❌ Probe Failed. Response Payload:", e1.response ? JSON.stringify(e1.response.data, null, 2) : e1.message);
        process.exit(1);
    }
}

probeSora();
