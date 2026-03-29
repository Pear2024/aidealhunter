const axios = require('axios');
const key = 'sk_07af332575b31864a3a117030448e8a0851d23025eaf7572';

async function testTTS() {
  try {
    const res = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL`, {
      text: "Testing 1 2 3",
      model_id: "eleven_monolingual_v1"
    }, {
      headers: { 'xi-api-key': key }
    });
    console.log("SUCCESS:", res.status);
  } catch (e) {
    console.log("FAILED:", e.response?.status, e.response?.data);
  }
}
testTTS();
