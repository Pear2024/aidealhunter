require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const googleTTS = require('google-tts-api');
const ffmpeg = require('fluent-ffmpeg');

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
    
    // 1. Database Connection
    console.log("🔌 Connecting to MySQL...");
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    });

    const [rows] = await conn.execute("SELECT * FROM normalized_deals WHERE image_url IS NOT NULL ORDER BY RAND() LIMIT 1");
    if (rows.length === 0) {
        console.error("❌ No deals found in DB.");
        return;
    }
    const deal = rows[0];
    await conn.end();

    console.log(`🎯 Selected Deal: ${deal.title}`);

    // 2. Gemini Script Generation
    console.log("✍️  Generating 15s Viral Script via Gemini...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            script: { type: SchemaType.STRING, description: "A catchy, fast-paced 15-second viral voiceover script. ABSOLUTE MAXIMUM 180 CHARACTERS OVERALL. Hook them instantly. Say link in bio." },
            short_caption: { type: SchemaType.STRING, description: "A highly visible 4-6 word clickbait caption to overlay in the middle of the video." }
        },
        required: ["script", "short_caption"]
    };
    
    const textModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    });

    const prompt = `Write a viral 15-second TikTok/Reels voiceover script based on this product deal:\nTitle: ${deal.title}\nOriginal Price: ${deal.price_min}\nIt must sound like an enthusiastic frugal influencer trying to get the viewer to steal this deal immediately. Hook them instantly. STRICT RULE: Cannot exceed 180 characters total.`;
    const result = await textModel.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text());
    
    // Hard-cap the text to 195 to prevent TTS API explosion
    const cleanScript = aiResponse.script.slice(0, 195);
    console.log(`📜 Script: "${cleanScript}"`);

    // 3. Audio & Image Acquisition
    console.log("🎙️  Synthesizing TTS Audio...");
    const url = googleTTS.getAudioUrl(cleanScript, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
    });
    
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, 'reel_audio.mp3');
    const imagePath = path.join(tempDir, 'reel_image.jpg');
    const outPath = path.join(os.homedir(), 'Desktop', 'auto_reel_test.mp4');

    await downloadFile(url, audioPath);
    console.log("🖼️  Downloading authentic Product Cover Image...");
    await downloadFile(deal.image_url, imagePath);

    // 4. Video Assembly
    console.log("⚙️  Assembling MP4 via FFmpeg...");
    
    ffmpeg()
        .input(imagePath)
        .loop() // Loop the single image
        .input(audioPath)
        // Video Filter: Extremely blurry 9:16 background, and cleanly proportioned foreground
        .complexFilter([
            '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=50[bg]',
            '[0:v]scale=900:1200:force_original_aspect_ratio=decrease[fg]',
            '[bg][fg]overlay=(W-w)/2:(H-h)/2[final]'
        ])
        .outputOptions([
            '-map [final]',
            '-map 1:a',         // Map audio
            '-c:v libx264',     // Video codec
            '-preset fast',
            '-pix_fmt yuv420p',
            '-c:a aac',         // Audio codec
            '-b:a 192k',
            '-shortest'         // End video when shortest stream (audio) ends
        ])
        .save(outPath)
        .on('end', async () => {
            console.log(`✅ SUCCESS! Reel rendered flawlessly to: ${outPath}`);
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
                const caption = `🚨 🔥 ${deal.title}\n\n👉 Steal this deal right here: ${affiliateLink}\n\n#Hemet #InlandEmpire #DealHunter #Promos`;

                const form = new FormData();
                form.append('access_token', token);
                form.append('description', caption);
                form.append('source', fs.createReadStream(outPath));

                const response = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/videos`, form, {
                    headers: form.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

                console.log(`🎉 MEGA SUCCESS! Reel LIVE on Facebook! Status:`, response.data);
            } catch (err) {
                 console.error("❌ Facebook API Error:", err.response ? JSON.stringify(err.response.data) : err.message);
            }
        })
        .on('error', (err) => {
            console.error(`❌ FFmpeg Error: ${err.message}`);
        });
}

main();
