require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

async function testMusicGen() {
    console.log("🎵 Initiating Music Generation (Minimax) + AI Image Studio Test...");
    try {
        if (!process.env.AIMLAPI_KEY) throw new Error("AIMLAPI_KEY missing");

        const tempDir = os.tmpdir();
        const finalMp4 = path.join(tempDir, 'relaxing_ai_music.mp4');
        const imgPath = path.join(tempDir, 'relaxing_bg.png');
        const audioPath = path.join(tempDir, 'relaxing_audio.mp3');

        // 1. Generate Image
        console.log("🎨 1/3 Generating beautiful relaxing image...");
        const imgRes = await axios.post('https://api.aimlapi.com/v1/images/generations', {
            model: "dall-e-3",
            prompt: "A breathtaking and ultra-aesthetic relaxing scenery, warm golden hour sunset over crystal clear water, lush green mountains, soft glowing cinematic light, 8k resolution, photorealistic, calming vibes.",
            n: 1, size: "1024x1024"
        }, { headers: { 'Authorization': `Bearer ${process.env.AIMLAPI_KEY}`, 'Content-Type': 'application/json' } });
        
        console.log("   ✅ Image generated! Downloading...");
        const imgData = await axios.get(imgRes.data.data[0].url, { responseType: 'arraybuffer' });
        fs.writeFileSync(imgPath, imgData.data);

        // 2. Generate Audio (Meta MusicGen via HuggingFace Free Inference)
        console.log("🎹 2/3 Requesting relaxing instrumental music from Meta MusicGen...");
        const musicRes = await axios.post(
            'https://api-inference.huggingface.co/models/facebook/musicgen-small',
            { inputs: "A beautiful, relaxing acoustic melody, soft piano and acoustic guitar, calm, soothing, peaceful, instrumental only." },
            { 
                headers: { 'Content-Type': 'application/json' },
                responseType: 'arraybuffer',
                timeout: 120000 // Give inference time to wake up model
            }
        ).catch(e => {
            console.error("MusicGen Inference Timeout/Error:", e.message);
            throw new Error("HuggingFace MusicGen Inference failed to wake up in time. Please try again.");
        });

        console.log("   ✅ Song finished formatting from FLAC/WAV!");
        fs.writeFileSync(audioPath.replace('.mp3', '.wav'), musicRes.data);
        const newAudioPath = audioPath.replace('.mp3', '.wav');

        // 3. Assemble with FFmpeg
        console.log("⚙️ 3/3 Stitching Audio & Image into Video with FFmpeg...");
        const filter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;
        execSync(`ffmpeg -y -loop 1 -i ${imgPath} -i ${newAudioPath} -map 0:v -map 1:a -vf "${filter}" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t 60 ${finalMp4}`, { stdio: 'pipe' });

        console.log(`\n🎉 MEGA SUCCESS! Beautiful AI Music Video created flawlessly.`);
        console.log(`👉 File saved to: ${finalMp4}`);
        
    } catch (e) {
        if (e.response && e.response.data) {
             const errorBuffer = Buffer.from(e.response.data).toString('utf8');
             console.error("\n❌ API Error:", errorBuffer);
        } else {
             console.error("\n❌ System Error:", e.message);
        }
    }
}

testMusicGen();
