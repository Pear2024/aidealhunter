const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testImgBB() {
    try {
        const fetchRes = await fetch('https://image.pollinations.ai/prompt/cat');
        const buffer = await fetchRes.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        
        console.log("Base64 Length:", base64Image.length);

        const imgFormData = new URLSearchParams();
        imgFormData.append("image", base64Image);

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
            method: "POST",
            body: imgFormData
        });

        const imgbbData = await imgbbRes.json();
        console.log("ImgBB Response:", imgbbData);
    } catch (e) {
        console.error("Test failed:", e);
    }
}
testImgBB();
