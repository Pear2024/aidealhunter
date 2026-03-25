require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const ffmpeg = require('fluent-ffmpeg');

// AIMLAPI Key for Suno AI
const AIMLAPI_KEY = process.env.AIMLAPI_KEY || 'YOUR_AIMLAPI_KEY_HERE';

async function main() {
    console.log("🎵 AI Music Video Director (Suno + Sora) Initialized...");
    
    try {
        // 1. Fetch Deal
        console.log("🔌 Connecting to MySQL to find a deal...");
        const conn = await mysql.createConnection({
            host: (process.env.MYSQL_HOST || '').trim(),
            user: (process.env.MYSQL_USER || '').trim(),
            password: (process.env.MYSQL_PASSWORD || '').trim(),
            database: (process.env.MYSQL_DATABASE || 'defaultdb').trim(),
            port: parseInt((process.env.MYSQL_PORT || '20007').trim()),
            ssl: { rejectUnauthorized: false }
        });

        // ROI Protection: Only generate expensive AI Music Videos for High-Ticket items (Price >= $200)
        // AND Must be deeply discounted (Absolute highest dollar savings).
        const [rows] = await conn.execute(`
            SELECT * FROM normalized_deals 
            WHERE image_url IS NOT NULL 
              AND status = 'approved' 
              AND (url LIKE '%amazon.com%' OR url LIKE '%amzn.to%')
              AND discount_price >= 200 
              AND original_price > discount_price
            ORDER BY 
              CASE 
                WHEN title LIKE '%Apple%' OR brand LIKE '%Apple%' THEN 1
                WHEN title LIKE '%Dyson%' OR brand LIKE '%Dyson%' THEN 1
                WHEN title LIKE '%Sony%' OR brand LIKE '%Sony%' THEN 1
                WHEN title LIKE '%Samsung%' OR brand LIKE '%Samsung%' THEN 1
                WHEN title LIKE '%Bose%' OR brand LIKE '%Bose%' THEN 1
                WHEN title LIKE '%LG%' OR title LIKE '%OLED%' OR title LIKE '%QLED%' THEN 1
                WHEN title LIKE '%Designer%' OR title LIKE '%Luxury%' OR title LIKE '%Diamond%' THEN 1
                ELSE 0 
              END DESC,
              (original_price - discount_price) DESC, 
              profit_score DESC 
            LIMIT 1
        `);
        if (rows.length === 0) return console.error("❌ No active deals found.");
        const deal = rows[0];
        await conn.end();

        console.log(`🎯 Creating Music Video for: ${deal.title}`);
        
        // 2. Gemini Gen: Lyrics & Video Prompt
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                lyrics: { type: SchemaType.STRING, description: "Catchy, 4-line storytelling song lyrics. Structure it as a mini-story: [Verse 1] Struggle/Problem, [Chorus] Discovering the incredible [Product] that changes everything. Include emotion." },
                music_style: { type: SchemaType.STRING, description: "A genre prompt for the AI music generator (e.g., 'Emotional Pop Anthem', 'Upbeat K-Pop', 'Cinematic Lo-Fi Rap')" },
                sora_prompt: { type: SchemaType.STRING, description: "A photorealistic, highly detailed OpenAI Sora video prompt showing a continuous cinematic narrative. The scene must seamlessly transition from a relatable struggle to a triumphant moment using the product. Use sweeping camera movements and vivid lighting to tell the story visually in one long shot." }
            },
            required: ["lyrics", "music_style", "sora_prompt"]
        };
        
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", responseSchema: schema }});
        const prompt = `Product: ${deal.title}\nBrand: ${deal.brand}\nDiscount: $${deal.discount_price}\nWrite a 15-second emotional/fun story-driven song and a matching single-take cinematic Sora video prompt!`;
        const result = await textModel.generateContent(prompt);
        const aiResponse = JSON.parse(result.response.text());
        
        console.log(`\n🎤 [LYRICS]: ${aiResponse.lyrics}\n🎸 [GENRE]: ${aiResponse.music_style}\n🎥 [SORA VIBE]: ${aiResponse.sora_prompt}\n`);

        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, 'suno_audio.mp3');
        const soraPath = path.join(tempDir, 'sora_music_video.mp4');
        const outPath = path.join(tempDir, 'FINAL_MUSIC_REEL.mp4');

        // 3. Generate Audio using Suno (via AIMLAPI / 3rd Party)
        console.log("🎹 Requesting Suno AI Music Generation...");
        try {
            // Note: This is standard format for AIMLAPI / Suno AI Unofficial APIs.
            // If the endpoint changes, update the URL here.
            const sunoPayload = {
                prompt: aiResponse.lyrics,
                tags: aiResponse.music_style,
                title: "AI Deal Anthem",
                make_instrumental: false,
                wait_audio: true // Tell the API to wait until the MP3 is ready
            };
            
            // Example POST request to a standard proxy API:
            const sunoRes = await axios.post('https://api.aimlapi.com/v1/generate/suno', sunoPayload, {
                headers: { 'Authorization': `Bearer ${AIMLAPI_KEY}`, 'Content-Type': 'application/json' },
                timeout: 120000 // Generating music takes 1-2 minutes!
            });
            
            const audioUrl = sunoRes.data.audio_url || sunoRes.data[0]?.audio_url; // Format varies
            if (!audioUrl) throw new Error("No MP3 URL returned from Suno proxy");
            
            console.log(`🎧 Downloading Suno MP3...`);
            const writer = fs.createWriteStream(audioPath);
            const audioStreamRes = await axios({ method: 'GET', url: audioUrl, responseType: 'stream' });
            audioStreamRes.data.pipe(writer);
            await new Promise((r, j) => { writer.on('finish', r); writer.on('error', j); });
            console.log("✅ Custom Song saved!");
        } catch (e) {
            console.error("⚠️ Suno Engine failed. Did you add the AIMLAPI_KEY to .env.local?");
            console.error(e.message);
            process.exit(1); 
        }

        // 4. Generate Video using OpenAI Sora
        console.log("🎥 Ordering OpenAI Sora Cinematic Footage...");
        try {
            const soraPayload = { model: "sora-2", prompt: aiResponse.sora_prompt };
            const soraInit = await axios.post('https://api.openai.com/v1/videos', soraPayload, { 
                headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' } 
            });
            const videoId = soraInit.data.id;
            
            let soraStatus = soraInit.data.status;
            while (soraStatus === 'queued' || soraStatus === 'in_progress') {
                await new Promise(r => setTimeout(r, 15000));
                console.log(`⏳ Polling Sora cluster...`);
                const checkRes = await axios.get(`https://api.openai.com/v1/videos/${videoId}`, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } });
                soraStatus = checkRes.data.status;
                if (soraStatus === 'completed') {
                    console.log("📥 Downloading Sora MP4...");
                    const streamRes = await axios.get(`https://api.openai.com/v1/videos/${videoId}/content`, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }, responseType: 'stream' });
                    const writer = fs.createWriteStream(soraPath);
                    streamRes.data.pipe(writer);
                    await new Promise((r, j) => { writer.on('finish', r); writer.on('error', j); });
                    break;
                } else if (soraStatus === 'failed') throw new Error("Sora execution failed.");
            }
        } catch (e) {
            console.error("⚠️ Sora Error:", e.response ? e.response.data : e.message);
            // Fallback to static black frame if Sora crashes
            require('child_process').execSync(`ffmpeg -f lavfi -i color=c=black:s=720x1280:d=15 -frames:v 450 ${soraPath}`);
        }

        // 5. FFmpeg: Muxing Audio and Video
        console.log("⚙️  FFmpeg: Splicing Suno Audio with Sora Video...");
        ffmpeg()
            .input(soraPath)
            .inputOption('-stream_loop -1') // Loop video endlessly to match song
            .input(audioPath)
            .outputOptions([
                '-map 0:v',         // Video from Sora
                '-map 1:a',         // Audio from Suno
                '-c:v copy',        // Copy video without re-encoding
                '-c:a aac',         // Ensure audio is standardized
                '-shortest'         // Cut video when song ends (Or song when video ends)
            ])
            .save(outPath)
            .on('end', async () => {
                console.log(`✅ MEGA SUCCESS! Music Video Reel compiled perfectly to: ${outPath}`);
                
                // You can add Facebook Graph API upload here just like generate_reel.js!
                console.log("🚀 (Optional) Ready to upload via FB Graph API or send via Telegram!");
                process.exit(0);
            })
            .on('error', (err) => {
                console.error(`❌ FFmpeg Error: ${err.message}`);
                process.exit(1);
            });

    } catch (globalErr) {
        console.error("🚨 FATAL CRASH:", globalErr.message);
        process.exit(1);
    }
}

main();
