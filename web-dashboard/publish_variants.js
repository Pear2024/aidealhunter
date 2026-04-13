const mysql = require('mysql2/promise');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { GoogleGenAI } = require('@google/genai');
const FormData = require('form-data');
require('dotenv').config({ path: '.env.local' });

async function loadAndReview(conn, job) {
    // 1. Fetch versions
    const [optVersions] = await conn.execute(`SELECT * FROM reel_content_versions WHERE optimization_job_id = ? AND version_role = 'optimized' ORDER BY id DESC LIMIT 1`, [job.id]);
    const [origVersions] = await conn.execute(`SELECT * FROM reel_content_versions WHERE post_id = ? AND version_role = 'original'`, [job.source_post_id]);
    
    // 2. Publish Gate (Text Completeness & Duplicate check)
    if (optVersions.length === 0) throw new Error("PUBLISH_GATE_FAILED: Optimized version not found.");
    const variant = optVersions[0];
    
    if (variant.post_id !== null) throw new Error("PUBLISH_GATE_FAILED: Optimized variant already has a post_id.");
    if (origVersions.length === 0) throw new Error("PUBLISH_GATE_FAILED: Original version is missing. Trace broken.");
    
    const requiredFields = ["hook", "script", "caption", "comment_cta", "image_prompt"];
    for (const key of requiredFields) {
        if (!variant[key] || typeof variant[key] !== 'string' || variant[key].trim() === '') {
            throw new Error(`PUBLISH_GATE_FAILED: Optimized payload missing critical field (${key}).`);
        }
    }
    
    // Check if job is already published
    if (job.optimizer_status === 'published_variant') throw new Error("PUBLISH_GATE_FAILED: Job already marked as published_variant.");

    // 3. AI Reviewer & Revenue Gate
    console.log(`[VARIANT PUBLISHER] Gate 1 PASSED for Job ${job.id}. Checking AI compliance...`);
    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const reviewPrompt = `You are the Final Reviewer Gate for a Facebook Health Reel variant.
    Check for two things:
    1. Safety: Is this severely exaggerating medical claims?
    2. Engagement: Is the hook and CTA compelling enough to publish?
    
    Hook: ${variant.hook}
    Script: ${variant.script}
    Caption: ${variant.caption}
    CTA: ${variant.comment_cta}
    
    Respond in strict JSON: {"pass": boolean, "reason": "string", "score_out_of_10": number}`;

    const { Type } = require('@google/genai');
    const completion = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: reviewPrompt,
        config: {
            response_mime_type: "application/json",
            response_schema: {
                type: Type.OBJECT,
                properties: { pass: { type: Type.BOOLEAN }, reason: { type: Type.STRING }, score_out_of_10: { type: Type.INTEGER } },
                required: ["pass", "reason", "score_out_of_10"]
            }
        }
    });
    
    const reviewResult = JSON.parse(completion.text.match(/\{[\s\S]*\}/)[0]);
    if (!reviewResult.pass || reviewResult.score_out_of_10 < 6) {
        throw new Error(`PUBLISH_GATE_FAILED: AI Reviewer Rejected Variation. Reason: ${reviewResult.reason} (Score: ${reviewResult.score_out_of_10}/10)`);
    }

    console.log(`[VARIANT PUBLISHER] Gate 2 PASSED. Variant scored ${reviewResult.score_out_of_10}/10. Ready for FFMPEG.`);
    return variant;
}

async function renderResources(variant) {
    const TEMP_DIR = process.cwd();
    const audioPath = path.join(TEMP_DIR, `v_audio_${variant.id}.mp3`);
    const imgPath = path.join(TEMP_DIR, `v_img_${variant.id}.jpg`);
    const outPath = path.join(TEMP_DIR, `v_final_${variant.id}.mp4`);
    
    console.log(`[VARIANT PUBLISHER] Generating TTS...`);
    const googleTTS = require('google-tts-api');
    const results = await googleTTS.getAllAudioBase64(variant.script.slice(0, 800), { lang: 'en', slow: false, splitPunct: ',.?' });
    const base64Buffers = results.map(r => Buffer.from(r.base64, 'base64'));
    fs.writeFileSync(audioPath, Buffer.concat(base64Buffers));
    
    console.log(`[VARIANT PUBLISHER] Generating Visuals...`);
    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const imgResponse = await aiClient.models.generateImages({
            model: process.env.GEMINI_IMAGEN_MODEL || 'imagen-3.0-generate-001',
            prompt: `Premium vertical health ad design: ${variant.image_prompt}. STRICTLY: Emotional impact, single prominent subject, dark background, cinematic.`,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' }
        });
        const base64Image = imgResponse.generatedImages[0].image.imageBytes;
        fs.writeFileSync(imgPath, Buffer.from(base64Image, 'base64'));
    } catch(imgErr) {
        console.error(`[VARIANT PUBLISHER] AI Visual Generation failed, using fallback bg:`, imgErr.message);
        execSync(`ffmpeg -f lavfi -i color=c=0x150F15:s=1080x1920 -vframes 1 "${imgPath}"`, {stdio: 'ignore'});
    }

    console.log(`[VARIANT PUBLISHER] Compositing FFMPEG...`);
    const safeDuration = Math.max(8, variant.script.split(' ').length * 0.4) + 2; 
    execSync(`ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" -map 0:v -map 1:a -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.5)':d=700:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,format=yuv420p" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -t ${safeDuration} "${outPath}"`, { stdio: 'ignore', timeout: 120000 });
    
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 50000) {
        throw new Error("FFmpeg compositing failed.");
    }
    
    console.log(`[VARIANT PUBLISHER] Composition Complete -> ${outPath}`);
    return { audioPath, imgPath, outPath };
}

async function publishToFacebook(variant, outPath) {
    console.log(`[VARIANT PUBLISHER] Uploading to Facebook Graph API...`);
    const form = new FormData();
    form.append('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
    form.append('description', `[A/B Variant Test]\n\n${variant.caption}\n\n#NadaniaWellness`);
    form.append('source', fs.createReadStream(outPath));
    const res = await axios.post(`https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/videos`, form, { headers: form.getHeaders(), maxBodyLength: Infinity });
    
    const videoId = res.data.id;
    try {
        await axios.post(`https://graph.facebook.com/v19.0/${videoId}/comments`, { message: variant.comment_cta, access_token: process.env.FB_PAGE_ACCESS_TOKEN });
        console.log(`[VARIANT PUBLISHER] Variant ${videoId} published with Comment CTA pinned!`);
    } catch (err) {
        console.log(`[VARIANT PUBLISHER] Video ${videoId} posted, but failed to pin comment.`);
    }
    return videoId;
}

async function runPublisherQueue() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        ssl: { rejectUnauthorized: false }
    });

    console.log(`[VARIANT PUBLISHER] Starting publisher queue...`);
    
    const [jobs] = await conn.execute(`
        SELECT * FROM reel_optimization_jobs 
        WHERE optimizer_status = 'variant_generated' 
        ORDER BY updated_at ASC LIMIT 2
    `);
    
    if (jobs.length === 0) {
        console.log(`[VARIANT PUBLISHER] Queue empty.`);
        await conn.end();
        return;
    }

    for (const job of jobs) {
        let files = {};
        try {
            console.log(`\n-----------------------------------------`);
            console.log(`[VARIANT PUBLISHER] Processing variant for Job ${job.id}`);
            
            // Lock
            await conn.execute(`UPDATE reel_optimization_jobs SET optimizer_status = 'publishing_lock' WHERE id = ?`, [job.id]);
            
            // GATE
            const variant = await loadAndReview(conn, job);
            
            // COMPOSE
            files = await renderResources(variant);
            
            // PUBLISH
            const newPostId = await publishToFacebook(variant, files.outPath);
            
            // RECORD RETURNS
            await conn.execute(`
                UPDATE reel_content_versions 
                SET post_id = ?, publish_status = 'published' WHERE id = ?
            `, [newPostId, variant.id]);
            
            await conn.execute(`
                UPDATE reel_optimization_jobs 
                SET optimizer_status = 'published_variant', updated_at = NOW() WHERE id = ?
            `, [job.id]);
            
            console.log(`[VARIANT PUBLISHER] Pipeline SUCCESS. Job ${job.id} officially published as post_id: ${newPostId}`);
            
        } catch(e) {
            console.error(`[VARIANT PUBLISHER] Error on Job ${job.id}: ${e.message}`);
            // Fallback status
            await conn.execute(`UPDATE reel_optimization_jobs SET optimizer_status = 'failed_publish', updated_at = NOW() WHERE id = ? AND optimizer_status = 'publishing_lock'`, [job.id]);
        } finally {
            // Clean up files
            Object.values(files).forEach(fPath => {
                if(fPath && fs.existsSync(fPath)) fs.unlinkSync(fPath);
            });
        }
    }

    await conn.end();
}

runPublisherQueue().catch(console.error);
