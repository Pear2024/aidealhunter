require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const googleTTS = require('google-tts-api');
const ffmpeg = require('fluent-ffmpeg');

async function downloadFile(url, filepath) {
    try {
        const writer = fs.createWriteStream(filepath);
        const response = await axios({ 
            url: url, 
            method: 'GET', 
            responseType: 'stream'
        });
        response.data.pipe(writer);
        return await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`⚠️ Download failed: ${e.message}`);
    }
}

async function main() {
    console.log("🎬 Initiating Local Demonstration Reel Render...");
    
    // We use a mock deal to bypass database fetching for this fast demo
    const deal = {
        title: "Authentic Nongshim Shin Ramyun Noodle Soup",
        discount_price: 15.99,
        original_price: 22.99,
        image_url: "https://m.media-amazon.com/images/I/81I-uB+SXXL._SL1500_.jpg", // Shin Ramyun generic photo
        brand: "Nongshim"
    };

    console.log(`🎯 Demo Deal: ${deal.title}`);

    // Hardcode a short script to avoid the google-tts 200 char limit crash
    const cleanScript = "I almost paid twenty two dollars for Shin Ramyun until I found this crazy cheat code! It is exactly fifteen bucks now! Check the link in my profile right now to score it.";
    const subtitles = [
        "Almost paid $22?! 💸",
        "Found a cheat code! 🤫",
        "Shin Ramyun 🍜",
        "Only $15 right now! 🤯",
        "Link in profile! 🏃‍♂️"
    ];

    console.log(`📜 Script: "${cleanScript}"`);
    console.log(`🗨️ Subtitles:`, subtitles);

    // 3. Audio & Image Acquisition
    console.log("🎙️  Synthesizing Demo TTS Audio...");
    const url = googleTTS.getAudioUrl(cleanScript, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
    });
    
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, 'demo_audio.mp3');
    const imagePath = path.join(tempDir, 'demo_image.jpg');
    const outPath = '/tmp/reels_demo_preview.mp4'; // Save directly to tmp for easy access

    await downloadFile(url, audioPath);
    console.log("🖼️  Generating Generic Solid Color Block for Rendering...");
    require('child_process').execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=1000x1000:d=1 -frames:v 1 ${imagePath}`);

    // 4. Video Assembly + Bouncing Subtitles
    console.log("⚙️  Assembling MP4 via FFmpeg with Advanced Subtitles...");
    
    // We estimate 11 seconds for this short script
    const audioDurationEstimate = 11; 
    const chunkTime = audioDurationEstimate / subtitles.length;
    
    let drawtextFilters = subtitles.map((text, i) => {
        const start = i * chunkTime;
        const end = (i + 1) * chunkTime;
        // Strip emojis to prevent Freetype Lib errors
        const cleanText = text.replace(/[^a-zA-Z0-9 \$\!\?\%\.\,]/g, "").replace(/:/g, '\\\\:').trim();
        // Omit fontfile to use OS default, guaranteeing no Path errors
        return `drawtext=text='${cleanText}':fontcolor=white:fontsize=120:borderw=5:bordercolor=black:shadowcolor=black:shadowx=4:shadowy=4:x='(w-tw)/2':y='(h-th)/2 + 30*sin(t*10)':enable='between(t,${start},${end})'`;
    }).join(',');

    ffmpeg()
        .input(imagePath)
        .loop() // Loop the single image
        .input(audioPath)
        .complexFilter([
            '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=45[bg]',
            '[0:v]scale=900:1200:force_original_aspect_ratio=decrease[fg]',
            '[bg][fg]overlay=(W-w)/2:(H-h)/2[vid]',
            `[vid]${drawtextFilters}[final]`
        ])
        .outputOptions([
            '-map [final]',
            '-map 1:a',         // Map audio
            '-c:v libx264',     // Video codec
            '-preset fast',
            '-pix_fmt yuv420p',
            '-c:a aac',         // Audio codec
            '-b:a 192k',
            '-shortest'         // End video when shortest stream ends
        ])
        .save(outPath)
        .on('end', async () => {
            console.log(`✅ SUCCESS! Demo Reel Rendered to: ${outPath}`);
            // Move file to artifacts for the AI Walkthrough viewer
            const artifactDir = '/Users/pear/.gemini/antigravity/brain/6df5f3f3-1c1d-46f4-b4fc-641ffa6e9b2f';
            fs.copyFileSync(outPath, path.join(artifactDir, 'reels_demo_preview.mp4'));
            console.log("🎥 VIDEO COPIED TO ARTIFACTS DIRECTORY!");
        })
        .on('error', (err) => {
            console.error(`❌ FFmpeg Error: ${err.message}`);
        });
}

main();
