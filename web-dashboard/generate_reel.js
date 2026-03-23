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
    
    const prompt = `Write a viral, HILARIOUS TikTok/Reels voiceover script based on this product deal:\nTitle: ${deal.title}\nDiscount Price: $${actualPrice} ${oldPriceStr}\n\n[INSTRUCTIONS]: You are a hilarious, chaotic, and highly relatable comedian. Write a 15-second funny script about a deeply relatable daily struggle, and how this specific product is the ultimate lifesaver. Keep it punchy, chaotic, and witty. YOU MUST MENTION THE EXACT DISCOUNT PRICE IN THE AUDIO. Break the dialogue into exciting subtitle chunks with emojis.`;
    const result = await textModel.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text());
    
    // Hard-cap the text to 300 to prevent ultra-long audios
    let cleanScript = aiResponse.script.slice(0, 300);
    console.log(`📜 Script: "${cleanScript}"`);
    console.log(`🗨️ Subtitles:`, aiResponse.subtitles);

    // 2.5. Sora Cinematic Background Video Generation
    console.log("🎥 Ordering Sora Cinematic B-Roll Generator...");
    const tempDir = os.tmpdir();
    let soraPath = path.join(tempDir, 'sora_background.mp4');
    try {
        const soraPromptSchema = {
            type: SchemaType.OBJECT,
            properties: { sora_prompt: { type: SchemaType.STRING, description: "Write a highly detailed, photorealistic 4k cinematic video prompt for OpenAI Sora showcasing a hilarious 15-second physical comedy scene involving the user's product. Describe an exaggerated, relatable daily struggle that gets magically and comically solved by the product entering the frame. CRITICAL PHYSICAL CONSTRAINTS: You must explicitly instruct Sora to maintain perfect human anatomy (exact number of limbs, no missing or merging legs/arms) and perfect object physics (e.g. hands gripping items naturally, no hovering objects, no spilling liquids unless intentional for the comedy). Exactly 1 continuous sentence. Do NOT include text overlays." } },
            required: ["sora_prompt"]
        };
        const soraModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", responseSchema: soraPromptSchema } });
        const soraRes = await soraModel.generateContent(`Product: ${deal.title} by ${deal.brand}.`);
        const soraPrompt = JSON.parse(soraRes.response.text()).sora_prompt;
        console.log(`📝 Sora Cinematic Prompt: "${soraPrompt}"`);

        const soraPayload = { model: "sora-2", prompt: soraPrompt };
        const soraInit = await axios.post('https://api.openai.com/v1/videos', soraPayload, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
        const videoId = soraInit.data.id;
        console.log(`✅ Sora Job Created: ${videoId}. Initiating asynchronous GPU polling loop...`);

        let soraStatus = soraInit.data.status;
        let attempts = 0;
        while (soraStatus === 'queued' || soraStatus === 'in_progress') {
            attempts++;
            await new Promise(r => setTimeout(r, 15000));
            console.log(`⏳ Polling Sora [${attempts}]... Waiting for GPU cluster...`);
            const checkRes = await axios.get(`https://api.openai.com/v1/videos/${videoId}`, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } });
            soraStatus = checkRes.data.status;
            if (soraStatus === 'completed') {
                console.log("📥 Downloading Sora MP4 Binary Stream...");
                const streamRes = await axios.get(`https://api.openai.com/v1/videos/${videoId}/content`, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }, responseType: 'stream' });
                const writer = fs.createWriteStream(soraPath);
                streamRes.data.pipe(writer);
                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
                console.log("🎞️ Sora Background Materialized successfully.");
                break;
            } else if (soraStatus === 'failed' || soraStatus === 'rejected') {
                throw new Error("Sora generation status marked as failed.");
            }
        }
    } catch (soraErr) {
        console.error("⚠️ Sora Error. Falling back to static color background...", soraErr.message);
        require('child_process').execSync(`ffmpeg -f lavfi -i color=c=black:s=720x1280:d=10 -frames:v 300 ${soraPath}`);
    }

    // 3. Audio & Image Acquisition
    console.log("🗣️ Synthesizing Ultra-Realistic Human Audio via OpenAI...");
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
    const outPath = path.join(tempDir, 'auto_reel_test.mp4');

    // 4. Video Assembly + Static Lower-Third Subtitles
    console.log("⚙️  Assembling Sora MP4 via FFmpeg with Layered Architecture...");
    
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
        .input(soraPath)
        .inputOption('-stream_loop -1') // Loop the short Sora video endlessly to fill audio duration if needed
        .input(audioPath)
        // Video Filter: Map Sora to BG, Composite Subtitles directly over it
        .complexFilter([
            '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]',
            `[bg]${drawtextFilters}[final]`
        ])
        .outputOptions([
            '-map [final]',
            '-map 1:a',         // Map audio (now input index 1)
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
                    // Robust ASIN Regex Extractor (Catches /dp/, /gp/product/, /product-reviews/, etc)
                    const asinMatch = finalUrl.match(new RegExp('/(?:dp|gp/product|product-reviews|aw/d)/([A-Z0-9]{10})', 'i'));
                    if (asinMatch && asinMatch[1]) {
                        // Force pristine high-converting canonical URL
                        finalUrl = `https://www.amazon.com/dp/${asinMatch[1]}/?tag=${affiliateTag}`;
                    } else if (!finalUrl.includes('tag=')) {
                        // Fallback
                        finalUrl += (finalUrl.includes('?') ? '&' : '?') + `tag=${affiliateTag}`;
                    }
                }
                const affiliateLink = finalUrl || "https://aidealhunter.vercel.app";
                const caption = `Anyone else struggling with this lately? 😅 Found the ${deal.title} and wondering if it actually works as well as people say.\n\nDrop a comment if you've tried it! 👇`;

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
                
                // INJECT FIRST COMMENT
                if (response.data && response.data.id) {
                     try {
                          await axios.post(`https://graph.facebook.com/v19.0/${response.data.id}/comments`, {
                              message: `🔗 Here is the exact link I found: ${affiliateLink}`,
                              access_token: token
                          });
                          console.log(`✅ Secondary First Comment Proxy Executed for Video ${response.data.id}`);
                     } catch(err) {
                          console.error('First Comment Proxy Error:', err.message);
                     }
                }
                
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
