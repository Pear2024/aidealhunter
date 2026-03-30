require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const ffmpeg = require('fluent-ffmpeg');

async function fetchHealthNews() {
    const url = "https://news.google.com/rss/search?q=Medical+AI+OR+Health+Technology+OR+Cellular+Nutrition&hl=en-US&gl=US&ceid=US:en";
    const response = await fetch(url, { cache: 'no-store' });
    const xmlText = await response.text();
    const urlRegex = /<item>([\s\S]*?)<\/item>/g;
    const itemMatches = xmlText.match(urlRegex) || [];
    let items = [];
    for (let i = 0; i < Math.min(itemMatches.length, 5); i++) {
        const itemXml = itemMatches[i];
        const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) items.push(titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    }
    return items;
}

async function main() {
    console.log("🎬 Initiating Nadania Medical AI Auto-Reels Engine (3x/Day)...");
    
    try {
        const newsItems = await fetchHealthNews();
        if (newsItems.length === 0) throw new Error("No news found.");
        const selectedTopic = newsItems[Math.floor(Math.random() * newsItems.length)];
        console.log(`🎯 Selected Topic: ${selectedTopic}`);

        console.log("✍️ Generating 15s Educational Health Script via Gemini...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                script: { type: SchemaType.STRING, description: "The spoken voiceover script. Must sound like a professional, intelligent doctor sharing a 'mind-blowing' cell science fact or AI health tech news. Max 20 seconds." },
                subtitles: { 
                    type: SchemaType.ARRAY, 
                    items: { type: SchemaType.STRING },
                    description: "Script broken down into very short punchy chunks. ABSOLUTELY MAX 3-4 WORDS PER CHUNK so it fits on screen horizontally." 
                },
                image_prompt: { type: SchemaType.STRING, description: "A highly diverse, hyper-realistic DALL-E 3 image prompt matching the topic. EXTREMELY DIVERSE. Do NOT use sci-fi, glowing holograms, or teal/cyan medical rooms. Use varied aesthetics: sunny bright clinics, diverse human patients, beautiful nature scenes, highly realistic macro biology." }
            },
            required: ["script", "subtitles", "image_prompt"]
        };
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", responseSchema: schema } });
        const result = await textModel.generateContent(`Title: ${selectedTopic}. Write a viral 15-second educational Reels script based on this.`);
        const aiResponse = JSON.parse(result.response.text());
        
        let cleanScript = aiResponse.script.slice(0, 190);
        console.log(`📜 Script: "${cleanScript}"`);

        // Google Free TTS
        console.log("🗣️ Synthesizing Medical Voice via Google TTS...");
        const googleTTS = require('google-tts-api');
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, 'health_reel_audio.mp3');
        const audioBase64 = await googleTTS.getAudioBase64(cleanScript, { lang: 'en', slow: false, host: 'https://translate.google.com' });
        fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));

        // TRUE AI VIDEO Generation via Magic / Minimax
        console.log("🎬 Initiating TRUE AI Video Generation via Magic/Minimax...");
        const videoPath = path.join(tempDir, 'health_bg.mp4');
        let rawVideoUrl = null;
        try {
            const videoPayload = {
                model: "magic/text-to-video",
                prompt: aiResponse.image_prompt,
            };
            
            const submitRes = await axios.post('https://api.aimlapi.com/v2/video/generations', videoPayload, { 
                headers: { 'Authorization': `Bearer ${process.env.AIMLAPI_KEY}`, 'Content-Type': 'application/json' } 
            });
            
            const genId = submitRes.data.id;
            console.log(`⏳ Video Task submitted: ${genId}. Waiting for Magic rendering (approx 1-3 mins)...`);
            
            // Poll for completion (up to 5 minutes)
            let attempts = 0;
            while (attempts < 30 && !rawVideoUrl) {
                await new Promise(r => setTimeout(r, 10000)); // wait 10s
                const pollRes = await axios.get(`https://api.aimlapi.com/v2/video/generations/${genId}`, {
                    headers: { 'Authorization': `Bearer ${process.env.AIMLAPI_KEY}` }
                });
                const status = pollRes.data.status;
                process.stdout.write(` [${status}] `);
                if (status === 'completed') {
                    rawVideoUrl = pollRes.data.video?.url || pollRes.data.url;
                    console.log("\n✅ Video Rendering Complete!");
                    break;
                } else if (status === 'failed') {
                    throw new Error("Video generation failed on server");
                }
                attempts++;
            }

            if (!rawVideoUrl) throw new Error("Video polling timed out.");

            // Download the raw Magic Video (.mp4)
            console.log("⬇️ Downloading RAW AI Video...");
            const vData = await axios.get(rawVideoUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(videoPath, vData.data);
            console.log("🎞️ True AI Video Downloaded!");

        } catch (vidErr) {
            console.error("\n❌ Magic Video Failed:", vidErr.response ? JSON.stringify(vidErr.response.data) : vidErr.message);
            // Fallback purely generative synthetic video using FFmpeg if API dies
            require('child_process').execSync(`ffmpeg -y -f lavfi -i testsrc=duration=5:size=1080x1920:rate=25 -f lavfi -i color=c=0x10b981:s=1080x1920:d=5 -filter_complex "[0:v][1:v]blend=all_mode='overlay'[v]" -map "[v]" ${videoPath}`);
        }

        // FFMPEG Assembly
        console.log("⚙️ Assembling Reel via FFmpeg (Looping AI Video + Syncing TTS + Subtitles)...");
        const outPath = path.join(tempDir, 'auto_health_reel.mp4');
        const audioDurationEstimate = Math.max(8, cleanScript.split(' ').length * 0.4); 
        const chunkTime = audioDurationEstimate / Math.max(1, aiResponse.subtitles.length);
        
        let drawtextFilters = aiResponse.subtitles.map((text, i) => {
            const start = i * chunkTime;
            const end = (i + 1) * chunkTime;
            const cleanText = text.replace(/[^a-zA-Z0-9 \$\!\?\%\.\,]/g, "").replace(/:/g, '\\\\:').trim();
            return `drawtext=fontfile=/Library/Fonts/Arial.ttf:text='${cleanText}':fontcolor=yellow:fontsize=60:borderw=5:bordercolor=black:shadowcolor=black:shadowx=4:shadowy=4:x='(w-tw)/2':y='(h/2)+400':enable='between(t,${start},${end})'`;
        }).join(',');

        const totalFrames = Math.ceil((audioDurationEstimate + 2) * 25);
        // Remove Zoompan since we have actual video now, just scale/crop to vertical formatting
        const videoFilter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${drawtextFilters ? ',' + drawtextFilters : ''}`;

        ffmpeg()
            // Important: Loop the Magic AI Video (which is usually ~5s) infinitely up to the shortest stream output logic
            .addInputOption('-stream_loop', '-1')
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                '-map 0:v', '-map 1:a',
                `-vf`, videoFilter,
                '-c:v libx264', '-preset fast', '-pix_fmt yuv420p',
                '-c:a aac', '-b:a 192k',
                '-shortest'
            ])
            .save(outPath)
            .on('end', async () => {
                console.log(`✅ Professional Health Reel rendered flawlessy: ${outPath}`);
                console.log("🚀 Initiating Facebook Graph API Reels Upload...");

                try {
                    const pageId = process.env.FB_PAGE_ID;
                    const token = process.env.FB_PAGE_ACCESS_TOKEN;
                    if (!pageId || !token) throw new Error("Missing FB API keys!");

                    const caption = `🔬 ${selectedTopic}\n\nOur modern lifestyle is constantly testing our cells. Are you protecting yours?\n\nFollow us for daily Medical AI health updates! #healthtech #medicalai #nadaniawellness`;
                    
                    const form = new FormData();
                    form.append('access_token', token);
                    form.append('description', caption);
                    form.append('source', fs.createReadStream(outPath));

                    const response = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/videos`, form, {
                        headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 60000
                    });
                    console.log(`🎉 MEGA SUCCESS! Health Reel LIVE! Status:`, response.data);
                    
                    if (response.data && response.data.id) {
                         try {
                              await axios.post(`https://graph.facebook.com/v19.0/${response.data.id}/comments`, {
                                  message: `🩺 Stop guessing and let clinical AI analyze your actual cellular needs for FREE. Try our Medical AI assessment here: https://nadaniadigitalllc.com/wellness`,
                                  access_token: token
                              });
                              console.log(`✅ Assessment CTA Comment Injected Successfully!`);
                         } catch(err) {
                              console.error('Comment Proxy Error:', err.message);
                         }
                    }
                    process.exit(0);
                } catch (fbErr) {
                    console.error("❌ FB Upload Error", fbErr.message);
                    process.exit(1);
                }
            })
            .on('error', (err) => {
                console.error(`❌ FFmpeg Error: ${err.message}`); process.exit(1);
            });

    } catch (globalErr) {
        console.error("🚨 FATAL CRASH:", globalErr.stack);
        process.exit(1);
    }
}
main();
