require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const ffmpeg = require('fluent-ffmpeg');

async function sendTelegramAlert(message) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8189986883';
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML'
        });
    } catch (e) {}
}

async function downloadFile(url, filepath, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const writer = fs.createWriteStream(filepath);
            const response = await axios({ 
                url: url + (url.includes('?') ? '&' : '?') + `retry=${i}`, 
                method: 'GET', 
                responseType: 'stream',
                timeout: 10000
            });
            response.data.pipe(writer);
            return await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (e) {
            console.error(`⚠️ Download attempt ${i+1} failed: ${e.message}`);
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function main() {
    console.log("🎬 Initiating Facebook Auto-Reels Engine...");
    
    try {
        // 1. Database Connection
        console.log("🔌 Connecting to MySQL...");
        const conn = await mysql.createConnection({
            host: (process.env.MYSQL_HOST || '').trim(),
            user: (process.env.MYSQL_USER || '').trim(),
            password: (process.env.MYSQL_PASSWORD || '').trim(),
            database: (process.env.MYSQL_DATABASE || 'defaultdb').trim(),
            port: parseInt((process.env.MYSQL_PORT || '20007').trim()),
            ssl: { rejectUnauthorized: false }
        });

        const [rows] = await conn.execute(`
            SELECT * FROM normalized_deals 
            WHERE image_url IS NOT NULL 
              AND status = 'approved'
            ORDER BY RAND() LIMIT 1
        `);
        if (rows.length === 0) {
            console.error("❌ No discounted deals found in DB.");
            return;
        }
        const deal = rows[0];
    await conn.end();

    console.log(`🎯 Selected Deal: ${deal.title}`);

    // 2. Gemini Script Generation
    console.log("✍️  Generating 15s Story-Driven Script via Gemini...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            script: { type: SchemaType.STRING, description: "The full spoken voiceover script. MUST speak like a real human influencer finding a crazy cheat code or secret. Use pauses and excitement. Maximum 20 seconds long." },
            subtitles: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "The script broken down into 4 to 6 short, punchy 3-word chunks with emojis. Must perfectly match the spoken script chronologically." 
            }
        },
        required: ["script", "subtitles"]
    };
    
    const textModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    });

    const actualPrice = deal.discount_price || deal.original_price || "an amazing value";
    const oldPriceStr = deal.original_price ? `(Was $${deal.original_price})` : "";
    
    const prompt = `Write a viral, story-driven TikTok/Reels voiceover script based on this product deal:\nTitle: ${deal.title}\nDiscount Price: $${actualPrice} ${oldPriceStr}\nBrand: ${deal.brand}\n\n[INSTRUCTIONS]: You are a highly professional, relatable UGC influencer. Do NOT sound like an ad. Hook them instantly (e.g., 'I almost paid full price until I found this secret...'). YOU MUST MENTION THE EXACT DISCOUNT PRICE IN THE AUDIO. Break the dialogue into exciting subtitle chunks with emojis.`;
    const result = await textModel.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text());
    
    // Hard-cap the text to 300 to prevent ultra-long audios
    let cleanScript = aiResponse.script.slice(0, 300);
    console.log(`📜 Script: "${cleanScript}"`);
    console.log(`🗨️ Subtitles:`, aiResponse.subtitles);

    // 3. Audio & Image Acquisition
    console.log("🗣️ Synthesizing Ultra-Realistic Human Audio via OpenAI...");
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, 'reel_audio.mp3');
    // Fetch OpenAI TTS
    const openAIResponse = await axios.post('https://api.openai.com/v1/audio/speech', {
        model: "tts-1",
        voice: "onyx", // Deep, professional, charismatic male voice
        input: cleanScript
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
    });
    
    fs.writeFileSync(audioPath, openAIResponse.data);
    const imagePath = path.join(tempDir, 'reel_image.jpg');
    const outPath = path.join(tempDir, 'auto_reel_test.mp4');

    try {
        console.log("🖼️  Downloading authentic Product Cover Image...");
        await downloadFile(deal.image_url.trim(), imagePath);
    } catch (fetchErr) {
        console.error("⚠️ CDN Asset failure. Applying emergency solid-color fallback...", fetchErr.message);
        require('child_process').execSync(`ffmpeg -f lavfi -i color=c=black:s=1000x1000:d=1 -frames:v 1 ${imagePath}`);
    }

    // 4. Video Assembly + Bouncing Subtitles
    console.log("⚙️  Assembling MP4 via FFmpeg with Advanced Subtitles...");
    
    // Determine dynamic duration based on script chunks (Assuming average audio is ~12-15 seconds)
    // We will distribute the subtitle arrays uniformly across the estimated video runtime.
    // For safety, we set a 12 second baseline, FFmpeg will '-shortest' to the audio track anyway.
    const audioDurationEstimate = Math.max(8, cleanScript.split(' ').length * 0.4); 
    const chunkTime = audioDurationEstimate / Math.max(1, aiResponse.subtitles.length);
    
    let drawtextFilters = aiResponse.subtitles.map((text, i) => {
        const start = i * chunkTime;
        const end = (i + 1) * chunkTime;
        // Aggressively strip emojis and non-standard unicode to protect Linux Freetype
        const cleanText = text.replace(/[^a-zA-Z0-9 \$\!\?\%\.\,]/g, "").replace(/:/g, '\\\\:').trim();
        // Clean, cinematic static lower-third subtitle (no bouncing, moved below the main product)
        return `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${cleanText}':fontcolor=white:fontsize=75:borderw=3:bordercolor=black:shadowcolor=black:shadowx=2:shadowy=2:x='(w-tw)/2':y='h-th-300':enable='between(t,${start},${end})'`;
    }).join(',');

    ffmpeg()
        .input(imagePath)
        .loop() // Loop the single image
        .input(audioPath)
        // Video Filter: Highly cinematic blurred background, centered popup foreground, and dynamic subtitles!
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
            '-shortest'         // End video when shortest stream (audio track) ends
        ])
        .save(outPath)
        .on('end', async () => {
            console.log(`✅ SUCCESS! Professional Reel rendered flawlessly to: ${outPath}`);
            console.log("🚀 Initiating Facebook Graph API Reels Upload...");

            try {
                const pageId = process.env.FB_PAGE_ID;
                const token = process.env.FB_PAGE_ACCESS_TOKEN;
                
                if (!pageId || !token) {
                    console.log("❌ Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in .env.local! Cannot upload.");
                    return;
                }

                // STEP 1: FB Videos Endpoint via multipart form
                console.log("📡 Step 1: Submitting multipart stream to Graph API...");
                // Affiliate Enforcement Engine
                let finalUrl = deal.url;
                if (finalUrl && finalUrl.includes('amazon.com')) {
                    const affiliateTag = process.env.AMAZON_AFFILIATE_TAG || "smartshop0c33-20";
                    if (!finalUrl.includes('tag=')) {
                        finalUrl += (finalUrl.includes('?') ? '&' : '?') + `tag=${affiliateTag}`;
                    }
                }
                const affiliateLink = finalUrl || "https://aidealhunter.vercel.app";
                const caption = `🚨 🔥 DEAL DROP: ${deal.title}\n💰 Just $${actualPrice} ${oldPriceStr}!\n\n👉 Steal this deal right here: ${affiliateLink}\n\n#Hemet #InlandEmpire #DealHunter #Promos`;

                const form = new FormData();
                form.append('access_token', token);
                form.append('description', caption);
                form.append('source', fs.createReadStream(outPath));

                const response = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/videos`, form, {
                    headers: form.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 60000 // 60 seconds hard timeout for Facebook Server stalls
                });

                console.log(`🎉 MEGA SUCCESS! Reel LIVE on Facebook! Status:`, response.data);
                
                // Finalize duplicate-prevention state
                console.log("🔒 Marking deal as published to block duplicates...");
                const updateConn = await mysql.createConnection({
                    host: (process.env.MYSQL_HOST || '').trim(),
                    user: (process.env.MYSQL_USER || '').trim(),
                    password: (process.env.MYSQL_PASSWORD || '').trim(),
                    database: (process.env.MYSQL_DATABASE || 'defaultdb').trim(),
                    port: parseInt((process.env.MYSQL_PORT || '20007').trim()),
                    ssl: { rejectUnauthorized: false }
                });
                await updateConn.execute("UPDATE normalized_deals SET status = 'published' WHERE id = ?", [deal.id]);
                await updateConn.end();
                
                console.log("🏁 Execution complete. Tearing down process.");
                process.exit(0);

            } catch (err) {
                 console.error("❌ Facebook API Error:", err.response ? JSON.stringify(err.response.data) : err.stack);
                 await sendTelegramAlert(`🚨 <b>[Graph API Fault]</b>\nReels generation succeeded, but Facebook Graph API upload failed!\n\n<code>${err.message}</code>`);
                 process.exit(1);
            }
        })
        .on('error', (err) => {
            console.error(`❌ FFmpeg Error: ${err.message}`);
            process.exit(1);
        });
    } catch (globalErr) {
        console.error("🚨 FATAL GLOBAL ERROR TERMINATING EXECUTION:", globalErr.stack);
        if (globalErr.code === 'ETIMEDOUT' || globalErr.message.includes('connect')) {
             await sendTelegramAlert(`🚨 <b>[GitHub Actions Crash]</b>\nReels Generator failed to connect to MySQL!\n\n(Did your DB password change? Update GitHub Secrets!)\n\n<code>${globalErr.message}</code>`);
        } else {
             await sendTelegramAlert(`🚨 <b>[GitHub Reels Crash]</b>\nFailed compiling FFmpeg video!\n\n<code>${globalErr.message}</code>`);
        }
        process.exit(1);
    }
}

main();
