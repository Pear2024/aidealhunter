const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        console.log("Submitting Magic video generation...");
        const res = await axios.post('https://api.aimlapi.com/v2/video/generations', {
            model: "magic/text-to-video",
            prompt: "A microscopic view of a glowing green T-cell hunting bacteria in a pristine futuristic medical environment",
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.AIMLAPI_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("Initial Response:", res.data);
        const generationId = res.data.id;
        if (!generationId) {
             console.error("No generation ID returned!");
             return;
        }

        let isCompleted = false;
        while (!isCompleted) {
            console.log(`Polling status for ${generationId}...`);
            await new Promise(r => setTimeout(r, 10000)); // wait 10s
            
            const pollRes = await axios.get(`https://api.aimlapi.com/v2/video/generations/${generationId}`, {
                headers: { 'Authorization': `Bearer ${process.env.AIMLAPI_KEY}` }
            });
            console.log("Poll Status:", pollRes.data.status);
            if (pollRes.data.status === 'completed' || pollRes.data.status === 'failed') {
                console.log("Final Polling Data:", pollRes.data);
                isCompleted = true;
            }
        }
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
test();
