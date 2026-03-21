const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testImgBB() {
    try {
        const remoteUrl = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';
        const imgFormData = new URLSearchParams();
        imgFormData.append("image", remoteUrl);

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
