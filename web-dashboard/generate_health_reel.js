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
                script: { type: SchemaType.STRING, description: "The spoken voiceover script. Must sound like a professional, intelligent doctor sharing a 'mind-blowing' cell science fact or AI health tech news. Keep it very punchy and fascinating. Max 20 seconds. Do not sound salesy." },
                subtitles: { 
                    type: SchemaType.ARRAY, 
                    items: { type: SchemaType.STRING },
                    description: "Script broken down into 4-6 short punchy chunks with emojis matching the audio exactly." 
                }
            },
            required: ["script", "subtitles"]
        };
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", responseSchema: schema } });
        const result = await textModel.generateContent(`Title: ${selectedTopic}. Write a viral 15-second educational Reels script based on this.`);
        const aiResponse = JSON.parse(result.response.text());
        
        let cleanScript = aiResponse.script.slice(0, 350);
        console.log(`📜 Script: "${cleanScript}"`);

        // OpenAI TTS
        console.log("🗣️ Synthesizing Medical AI Voice via OpenAI...");
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, 'health_reel_audio.mp3');
        const openAIResponse = await axios.post('https://api.openai.com/v1/audio/speech', {
            model: "tts-1", voice: "onyx", input: cleanScript
        }, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' });
        fs.writeFileSync(audioPath, openAIResponse.data);

        // Background Image Generation (Using DALL-E 3 as placeholder for Sora/Luma depending on API limit)
        console.log("🎨 Generating Cinematic AI Biology Background...");
        const imgPath = path.join(tempDir, 'health_bg.png');
        try {
            const bgRes = await axios.post('https://api.openai.com/v1/images/generations', {
                model: "dall-e-3",
                prompt: `Beautiful, glowing, cinematic macrophotography of a single glowing biological liposome cell in a bloodstream, soft teal and emerald lighting, highly detailed, 4k, hyperrealistic, medical technology concept. Vertical 9:16 aspect ratio.`,
                n: 1,
                size: "1024x1792"
            }, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } });
            
            const imgData = await axios.get(bgRes.data.data[0].url, { responseType: 'arraybuffer' });
            fs.writeFileSync(imgPath, imgData.data);
            console.log("🎞️ Background Image Generated.");
        } catch (imgErr) {
            console.error("Image gen failed, using fallback.", imgErr.message);
            require('child_process').execSync(`ffmpeg -y -f lavfi -i color=c=0x10b981:s=1080x1920:d=10 -frames:v 1 ${imgPath}`);
        }

        // FFMPEG Assembly
        console.log("⚙️ Assembling Reel via FFmpeg...");
        const outPath = path.join(tempDir, 'auto_health_reel.mp4');
        const audioDurationEstimate = Math.max(8, cleanScript.split(' ').length * 0.4); 
        const chunkTime = audioDurationEstimate / Math.max(1, aiResponse.subtitles.length);
        
        let drawtextFilters = aiResponse.subtitles.map((text, i) => {
            const start = i * chunkTime;
            const end = (i + 1) * chunkTime;
            const cleanText = text.replace(/[^a-zA-Z0-9 \$\!\?\%\.\,]/g, "").replace(/:/g, '\\\\:').trim();
            // Cinematic white text on teal/emerald background
            return `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${cleanText}':fontcolor=white:fontsize=75:borderw=4:bordercolor=black:shadowcolor=black:shadowx=3:shadowy=3:x='(w-tw)/2':y='(h/2)+400':enable='between(t,${start},${end})'`;
        }).join(',');

        ffmpeg()
            .input(imgPath)
            .loop(audioDurationEstimate + 2)
            .input(audioPath)
            .complexFilter([
                '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]',
                `[bg]${drawtextFilters}[final]`
            ])
            .outputOptions([
                '-map [final]', '-map 1:a',
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
