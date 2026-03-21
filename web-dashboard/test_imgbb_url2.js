const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testImgBB() {
    try {
        const remoteUrl = "https://oaidalleapiprodscus.blob.core.windows.net/private/org-639oQe3QkiIs9lMOsYqSMiJG/user-H3Rh4UWD8tpKOd2ylVx5J4T1/img-BU3UccYk1Mez0vkMEqMMJtyY.png?st=2026-03-21T21%3A23%3A00Z&se=2026-03-21T23%3A23%3A00Z&sp=r&sv=2026-02-06&sr=b&rscd=inline&rsct=image/png&skoid=b1a0ae1f-618f-4548-84fd-8b16cacd5485&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2026-03-21T05%3A07%3A14Z&ske=2026-03-22T05%3A07%3A14Z&sks=b&skv=2026-02-06&sig=L2igqwKQ7OJ0q3SM52Xqkigy/IpI2TI/fXRe0Yq22T8%3D";
        
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
