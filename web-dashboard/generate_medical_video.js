const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');
const Parser = require('rss-parser');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const AIMLAPI_KEY = process.env.AIMLAPI_KEY;
const FB_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

// Wait helper
const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchNews() {
    const parser = new Parser();
    const feed = await parser.parseURL('https://news.google.com/rss/search?q="Aidoc"+OR+"PathAI"+OR+"Tempus"+OR+"K Health"+OR+"Hippocratic AI"+OR+"Google Health"+OR+"IQVIA AI"+OR+"Notable Health"&hl=en-US&gl=US&ceid=US:en');
    const item = feed.items[0]; // Take top news
    return item;
}

async function requestText(prompt) {
    try {
        const res = await axios.post('https://api.aimlapi.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }]
        }, { headers: { 'Authorization': `Bearer ${AIMLAPI_KEY}` } });
        return res.data.choices[0].message.content.trim();
    } catch (e) {
        console.error("Text Gen Error");
        return "Breaking medical AI technology is reshaping the future of healthcare and extending lifespans globally.";
    }
}

async function generateTTS(script) {
    console.log("🎙️ Generating Voiceover via AIMLAPI...");
    try {
        const res = await axios.post('https://api.aimlapi.com/v1/audio/speech', {
            model: "tts-1",
            input: script,
            voice: "alloy"
        }, { 
            headers: { 'Authorization': `Bearer ${AIMLAPI_KEY}` },
            responseType: 'arraybuffer'
        });
        const outPath = path.join(__dirname, 'temp_voice.mp3');
        fs.writeFileSync(outPath, res.data);
        return outPath;
    } catch(e) {
        throw new Error("TTS Failed: " + (e.response?.data?.error?.message || e.message));
    }
}

async function generateVideo(prompt) {
    console.log("🎥 Generating Video via AIMLAPI (Minimax/Video)...");
    try {
        const res = await axios.post('https://api.aimlapi.com/images/generations', {
            model: "minimax/video-01",
            prompt: prompt,
        }, { 
            headers: { 'Authorization': `Bearer ${AIMLAPI_KEY}` },
            timeout: 180000 // 3 minutes timeout for video generation
        });
        
        const videoUrl = res.data.data?.[0]?.url?.video || res.data.data?.[0]?.url;
        if (!videoUrl) throw new Error("No video URL returned from AIMLAPI.");
        
        console.log("Downloading video from:", videoUrl);
        const vidBuffer = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        const outPath = path.join(__dirname, 'temp_visual.mp4');
        fs.writeFileSync(outPath, vidBuffer.data);
        return outPath;
    } catch(e) {
        console.error("Video Gen Failed, falling back to DALL-E 3 image via AIMLAPI (Zoom Effect).");
        try {
            const res = await axios.post('https://api.aimlapi.com/images/generations', {
                model: "dall-e-3",
                prompt: prompt,
                size: "1024x1024"
            }, { headers: { 'Authorization': `Bearer ${AIMLAPI_KEY}` } });
            
            const imgBuffer = await axios.get(res.data.data[0].url, { responseType: 'arraybuffer' });
            const outPath = path.join(__dirname, 'temp_visual.jpg');
            fs.writeFileSync(outPath, imgBuffer.data);
            return outPath;
        } catch (err2) {
            throw new Error("Both Video and Image generations failed via AIMLAPI.");
        }
    }
}

async function mixContent(audioPath, visualPath) {
    console.log("🎞️ Mixing AI Content via FFmpeg...");
    const outputPath = path.join(__dirname, 'final_medical_news.mp4');
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    // If visual is an image, we loop it and add a zoom effect. If it's a video, we loop it.
    if (visualPath.endsWith('.jpg')) {
        execSync(`ffmpeg -loop 1 -i ${visualPath} -i ${audioPath} -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.5)':d=700:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'" -y ${outputPath}`);
    } else {
        execSync(`ffmpeg -stream_loop -1 -i ${visualPath} -i ${audioPath} -c:v libx264 -c:a aac -shortest -map 0:v:0 -map 1:a:0 -y ${outputPath}`);
    }
    return outputPath;
}

async function uploadToFacebook(videoPath, description) {
    console.log("🚀 Uploading to Facebook Reels API...");
    const initRes = await axios.post(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/video_reels?upload_phase=start&access_token=${FB_ACCESS_TOKEN}`);
    const videoId = initRes.data.video_id;
    const uploadUrl = initRes.data.upload_url;

    const fileBuffer = fs.readFileSync(videoPath);
    await axios.post(uploadUrl, fileBuffer, {
        headers: { 'Authorization': `OAuth ${FB_ACCESS_TOKEN}`, 'offset': '0', 'file_size': fileBuffer.length.toString() }
    });

    await axios.post(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/video_reels?upload_phase=finish&video_id=${videoId}&video_state=PUBLISHED&description=${encodeURIComponent(description)}&access_token=${FB_ACCESS_TOKEN}`);
    console.log("✅ Deployed to Facebook Reels! Video ID:", videoId);
}

async function main() {
    try {
        console.log("---- STARTING MEDICAL AI DAILY VIDEO MODULE ----");
        if(!AIMLAPI_KEY) throw new Error("Missing AIMLAPI_KEY in .env.local");

        const news = await fetchNews();
        console.log(`🗞️ Today's Highlight: ${news.title}`);

        const promptBase = `News Title: ${news.title}. Content: ${news.contentSnippet}.`;
        
        // 1. Get Audio Script
        const scriptPrompt = `Act as an inspiring, professional medical tech presenter. Write a brilliant 40-word voiceover script (around 20-30 seconds of speech) summarizing this technology breakthrough in health and longevity. Tone must be awe-inspiring. Do not include stage directions. ` + promptBase;
        const script = await requestText(scriptPrompt);
        
        // 2. Get Video Prompt
        const visualPrompt = `A hyper-realistic, cinematic portrait or scene showing futuristic medical AI, glowing health tech, bright white and teal lighting, very professional and clean. Concept: ` + news.title.substring(0, 100);
        
        // 3. Generate Assets via AIMLAPI
        const audioFile = await generateTTS(script);
        const visualFile = await generateVideo(visualPrompt);
        
        // 4. Mix using ffmpeg
        const finalVideo = await mixContent(audioFile, visualFile);
        
        // 5. Publish
        const caption = `🧬 1-Minute Medical Tech Update!\n\n${script}\n\nRead more at the source: ${news.link}\n\n#MedicalAI #HealthTech #NadaniaWellness #ThreeInternational`;
        await uploadToFacebook(finalVideo, caption);
        
        console.log("🎉 Run completed successfully!");
    } catch(err) {
        console.error("❌ Fatal Error in Medical Video Generator: ", err.message);
    }
}

main();
