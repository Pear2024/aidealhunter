require('dotenv').config({ path: '.env.local' });
async function testDalle() {
    console.log("Testing DALL-E 3 with key:", process.env.OPENAI_API_KEY.slice(0, 10) + "...");
    const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "dall-e-3",
            prompt: "A beautifully lit professional photograph of a coffee cup.",
            n: 1,
            size: "1024x1024",
            response_format: "url"
        })
    });
    const res = await aiRes.json();
    console.log(JSON.stringify(res, null, 2));
}
testDalle();
