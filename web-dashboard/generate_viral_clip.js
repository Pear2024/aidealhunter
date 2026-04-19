// ============================================
// 🔥 VIRAL CLIP GENERATOR v2.0 — MASTER ENGINE
// Max 30 seconds | Multi-Scene | Emotion Scoring
// 5-Phase Structure: HOOK → PROBLEM → SECRET → RESULT → CTA
// Topic → Script → Scenes → TTS → Multi-Image → FFmpeg → Publish
// ============================================

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const { GoogleGenAI, Type } = require('@google/genai');
const { execSync } = require('child_process');

const RUN_ID = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const MAX_DURATION_SEC = 30; // 🔒 HARD CAP: 30 seconds

// ============================================
// 🛠️ HELPERS
// ============================================
function log(emoji, msg) { console.log(`${emoji} ${msg}`); }
function divider(title) { console.log('\n' + '─'.repeat(60)); log('📍', title); console.log('─'.repeat(60)); }

function getFFmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (fs.existsSync('/usr/local/bin/ffmpeg')) return '/usr/local/bin/ffmpeg';
  if (fs.existsSync('/opt/homebrew/bin/ffmpeg')) return '/opt/homebrew/bin/ffmpeg';
  return 'ffmpeg';
}

function getAudioDuration(ffmpegPath, audioPath) {
  try {
    const ffprobe = ffmpegPath.replace('ffmpeg', 'ffprobe');
    return parseFloat(execSync(
      `${ffprobe} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim());
  } catch {
    return 20;
  }
}

function safeParseJson(rawText) {
  let text = (rawText || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(text); } catch {}
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch {}
  }
  throw new Error(`Failed to parse JSON: ${text.slice(0, 200)}`);
}

async function sendDiscordNotification(title, description, color = 65280) {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      embeds: [{ title, description, color, timestamp: new Date().toISOString() }]
    }, { timeout: 10000 });
  } catch {}
}

// ============================================
// 🎯 STAGE 1: TOPIC SELECTION
// ============================================
async function selectTopic(conn) {
  divider('STAGE 1: Topic Selection');

  const cliTopic = process.argv[2];
  if (cliTopic) {
    log('📌', `CLI Topic: "${cliTopic}"`);
    return { id: null, topic: cliTopic, source: 'cli' };
  }

  // Try DB queue
  if (conn) {
    await conn.execute("UPDATE health_reels_queue SET status = 'pending', locked_by = NULL WHERE status = 'processing_lock' AND updated_at < NOW() - INTERVAL 2 HOUR");
    const [lockResult] = await conn.execute(
      "UPDATE health_reels_queue SET status = 'processing_lock', locked_by = ?, updated_at = NOW() WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1",
      [RUN_ID]
    );
    if (lockResult.affectedRows > 0) {
      const [rows] = await conn.execute("SELECT id, topic FROM health_reels_queue WHERE locked_by = ?", [RUN_ID]);
      if (rows.length > 0) {
        log('🔒', `DB Topic ID ${rows[0].id}: "${rows[0].topic}"`);
        return { id: rows[0].id, topic: rows[0].topic, source: 'db' };
      }
    }
  }

  // Google News RSS
  const searchTopics = ['Medical AI', 'Cellular Nutrition', 'anti-aging science', 'wellness technology', 'biohacking', 'metabolism boost', 'sleep science'];
  const randomQuery = encodeURIComponent(searchTopics[Math.floor(Math.random() * searchTopics.length)]);
  try {
    const response = await fetch(`https://news.google.com/rss/search?q=${randomQuery}&hl=en-US&gl=US&ceid=US:en`, { cache: 'no-store' });
    const xmlText = await response.text();
    for (const match of (xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [])) {
      const titleMatch = match.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const topic = titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        log('📰', `RSS Topic: "${topic}"`);
        return { id: null, topic, source: 'rss' };
      }
    }
  } catch (e) { log('⚠️', `RSS failed: ${e.message}`); }

  // Fallback viral topics
  const fallbacks = [
    'Why your afternoon fatigue is a cellular emergency',
    '3 signs your mitochondria are failing you',
    'The hidden toxin in your kitchen destroying your cells',
    'Scientists discovered cells can reverse their age',
    'This breakfast mistake is aging you 10 years faster',
    'Stop doing this after 40 if you want energy',
    'If you wake up tired daily, your cells need this',
    'Doctors rarely mention this hidden symptom',
  ];
  const topic = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  log('🎲', `Fallback Topic: "${topic}"`);
  return { id: null, topic, source: 'fallback' };
}

// ============================================
// 🎯 STAGE 2: MASTER VIRAL SCRIPT (5-Phase)
// ============================================
async function generateViralScript(topic) {
  divider('STAGE 2: Master Viral Script Generation');

  const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const MASTER_PROMPT = `You are an elite short-form viral content strategist for Facebook Reels, TikTok, Instagram Reels, and YouTube Shorts.

Your mission: Generate a HIGHLY VIRAL 20-30 second short video that maximizes:
1. 3-second retention (HOOK must be irresistible)
2. Full watch rate (every second must escalate)
3. Shares (content must feel "I need to share this")
4. Comments (CTA must trigger compulsive commenting)
5. Follows (position as authority)
6. Emotional reaction (shock, hope, fear, relief)
7. Curiosity click behavior (open loops)

━━━━━━━━━━━━━━━━━━━━━━
🎯 TARGET AUDIENCE
Adults age 25-65 interested in: Health, Weight loss, Anti-aging, Energy, Sleep, Hormones, Wellness, Motivation, Natural remedies, Science-backed improvement

━━━━━━━━━━━━━━━━━━━━━━
🎬 VIDEO STRUCTURE (STRICT 5-PHASE)
0-2 sec = HOOK (pattern interrupt, stop-scroll)
3-10 sec = PROBLEM (relatable pain, fear)
11-20 sec = SOLUTION / SECRET (hidden truth, fascination)
21-28 sec = RESULT (transformation, proof, hope)
28-30 sec = CTA (comment trigger, follow)

━━━━━━━━━━━━━━━━━━━━━━
🔥 VIRALITY PSYCHOLOGY TRIGGERS (USE ALL)
- Curiosity gaps ("Nobody tells you this...")
- Fear of missing out ("Before it's too late")
- Pain avoidance ("This is destroying your...")
- Transformation ("After just 7 days...")
- Hidden truth ("Doctors won't say this...")
- Fast result ("See results in 48 hours")
- Surprise ("Studies just confirmed...")
- Social proof ("90% of people don't know...")

━━━━━━━━━━━━━━━━━━━━━━
🚫 NEVER DO
- Boring intros, slow setup, long explanations
- Robotic wording, generic tips, weak CTA
- Medical claims without "research suggests" / "studies indicate"

━━━━━━━━━━━━━━━━━━━━━━
🎨 VISUAL STYLE
Fast cuts between scenes, bold dramatic lighting, zoom movements, emotional imagery, modern lifestyle scenes, before/after concepts, clean medical/science visuals, 9:16 vertical format

━━━━━━━━━━━━━━━━━━━━━━
📌 TODAY'S TOPIC: ${topic}

━━━━━━━━━━━━━━━━━━━━━━
Generate the BEST possible viral short video. Return JSON:
{
  "topic": "viral-optimized topic title",
  "hook": "first 2 seconds, max 8 words, STOP THE SCROLL",
  "script": "full voiceover script, 50-75 words, natural pause-friendly sentences matching the 5-phase structure",
  "scenes": [
    { "time": "0-2", "phase": "HOOK", "visual": "detailed scene-by-scene visual description for AI image generation", "subtitle": "bold subtitle text under 8 words" },
    { "time": "3-10", "phase": "PROBLEM", "visual": "...", "subtitle": "..." },
    { "time": "11-20", "phase": "SECRET", "visual": "...", "subtitle": "..." },
    { "time": "21-28", "phase": "RESULT", "visual": "...", "subtitle": "..." },
    { "time": "28-30", "phase": "CTA", "visual": "...", "subtitle": "..." }
  ],
  "caption": "viral caption with 5 hashtags for Facebook/Instagram",
  "cta": "comment trigger CTA (e.g. 'Comment ENERGY if this is you')",
  "emotion_score": 8,
  "viral_score": 85,
  "viral_reason": "1-line explanation of why this will go viral"
}`;

  const completion = await aiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: MASTER_PROMPT,
    config: {
      response_mime_type: 'application/json',
      response_schema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          hook: { type: Type.STRING },
          script: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                phase: { type: Type.STRING },
                visual: { type: Type.STRING },
                subtitle: { type: Type.STRING },
              },
              required: ['time', 'phase', 'visual', 'subtitle'],
            },
          },
          caption: { type: Type.STRING },
          cta: { type: Type.STRING },
          emotion_score: { type: Type.INTEGER },
          viral_score: { type: Type.INTEGER },
          viral_reason: { type: Type.STRING },
        },
        required: ['topic', 'hook', 'script', 'scenes', 'caption', 'cta', 'emotion_score', 'viral_score'],
      },
    },
  });

  const parsed = safeParseJson(completion.text);

  // Safety: truncate script to 75 words max
  const words = parsed.script.split(/\s+/);
  if (words.length > 80) {
    parsed.script = words.slice(0, 75).join(' ') + '.';
    log('✂️', `Script truncated to 75 words for 30s cap`);
  }

  // Ensure at least 3 scenes
  if (!parsed.scenes || parsed.scenes.length < 3) {
    parsed.scenes = [
      { time: '0-2', phase: 'HOOK', visual: parsed.scenes?.[0]?.visual || 'dramatic close-up face with shocked expression, dark moody lighting', subtitle: parsed.hook },
      { time: '3-15', phase: 'PROBLEM', visual: 'tired exhausted person holding head, dim lighting, stressed expression', subtitle: 'Your body is sending signals' },
      { time: '15-25', phase: 'SECRET', visual: 'glowing healthy cell visualization, bright vibrant energy, modern science aesthetic', subtitle: 'The hidden solution' },
      { time: '25-30', phase: 'CTA', visual: 'person smiling confident, golden sunrise light, hopeful and energized', subtitle: parsed.cta || 'Comment YES below' },
    ];
  }

  log('🪝', `Hook: "${parsed.hook}"`);
  log('📝', `Script: ${parsed.script.split(/\s+/).length} words`);
  log('🎬', `Scenes: ${parsed.scenes.length} (${parsed.scenes.map(s => s.phase).join(' → ')})`);
  log('💯', `Viral Score: ${parsed.viral_score}/100 | Emotion: ${parsed.emotion_score}/10`);
  log('🔥', `Viral reason: ${parsed.viral_reason || 'N/A'}`);

  // Log scene breakdown
  for (const scene of parsed.scenes) {
    log('  🎬', `[${scene.time}s] ${scene.phase}: "${scene.subtitle}" → ${scene.visual.slice(0, 60)}...`);
  }

  return parsed;
}

// ============================================
// 🎯 STAGE 3: VOICEOVER (TTS)
// ============================================
async function generateVoiceover(script, audioPath) {
  divider('STAGE 3: TTS Voiceover');

  if (process.env.ELEVENLABS_API_KEY) {
    try {
      log('🎙️', 'Using ElevenLabs (premium voice)...');
      const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
      const res = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.80, speed: 1.15 }
      }, {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      fs.writeFileSync(audioPath, res.data);
      log('✅', 'ElevenLabs TTS complete');
      return;
    } catch (e) {
      log('⚠️', `ElevenLabs failed: ${e.message}. Falling back to Google TTS.`);
    }
  }

  log('🎙️', 'Using Google TTS (free fallback)...');
  const googleTTS = require('google-tts-api');
  const results = await googleTTS.getAllAudioBase64(script.slice(0, 800), { lang: 'en', slow: false, splitPunct: ',.?' });
  const base64Buffers = results.map(r => Buffer.from(r.base64, 'base64'));
  fs.writeFileSync(audioPath, Buffer.concat(base64Buffers));
  log('✅', 'Google TTS complete');
}

// ============================================
// 🎯 STAGE 4: MULTI-SCENE IMAGE GENERATION
// ============================================
async function generateSceneImages(scenes, tempDir) {
  divider('STAGE 4: Multi-Scene Image Generation');

  const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const imagenModel = process.env.GEMINI_IMAGEN_MODEL || 'imagen-4.0-generate-001';
  const imagePaths = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const imgPath = path.join(tempDir, `scene_${RUN_ID}_${i}.jpg`);

    const enhancedPrompt = `${scene.visual}. Style: Ultra high-quality, vertical 9:16 format, bold dramatic lighting, emotionally striking, single clear subject, no text, no watermarks, premium social media content, vivid rich colors, cinematic depth of field.`;

    try {
      log('🎨', `Scene ${i + 1}/${scenes.length} [${scene.phase}]: Generating...`);
      const response = await aiClient.models.generateImages({
        model: imagenModel,
        prompt: enhancedPrompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        fs.writeFileSync(imgPath, Buffer.from(response.generatedImages[0].image.imageBytes, 'base64'));
        imagePaths.push(imgPath);
        log('✅', `Scene ${i + 1} saved`);
      } else {
        throw new Error('Empty image response');
      }
    } catch (e) {
      log('⚠️', `Scene ${i + 1} failed: ${e.message}`);
      // Generate fallback solid color per phase
      const colors = { HOOK: '0x1A0A2E', PROBLEM: '0x2D1B0E', SECRET: '0x0A2E1A', RESULT: '0x2E2A0A', CTA: '0x0A1A2E' };
      const color = colors[scene.phase] || '0x0A0F1F';
      const ffmpegCmd = getFFmpegPath();
      execSync(`${ffmpegCmd} -y -f lavfi -i "color=c=${color}:s=1080x1920:d=1" -vframes 1 "${imgPath}"`, { stdio: 'ignore' });
      imagePaths.push(imgPath);
      log('🎨', `Scene ${i + 1} fallback generated`);
    }
  }

  log('📊', `Images: ${imagePaths.length}/${scenes.length} generated`);
  return imagePaths;
}

// ============================================
// 🎯 STAGE 5: MULTI-SCENE VIDEO COMPOSITION
// ============================================
function composeMultiSceneVideo(audioPath, imagePaths, scenes, outPath) {
  divider('STAGE 5: Multi-Scene Video Composition (30s cap)');

  const ffmpegCmd = getFFmpegPath();
  const audioDur = getAudioDuration(ffmpegCmd, audioPath);
  const clampedDuration = Math.min(audioDur + 1.5, MAX_DURATION_SEC);
  const fps = 25;

  log('⏱️', `Audio: ${audioDur.toFixed(1)}s → Clamped: ${clampedDuration.toFixed(1)}s`);
  log('🎬', `Scenes: ${imagePaths.length} images → fast-cut composition`);

  if (imagePaths.length <= 1) {
    // Single image mode (fallback)
    return composeSingleImage(ffmpegCmd, audioPath, imagePaths[0], clampedDuration, fps, outPath);
  }

  // Multi-scene: render each scene clip, then concatenate
  const tempDir = path.dirname(outPath);
  const clipPaths = [];

  // Parse time ranges from scenes to calculate per-scene duration
  const totalScenes = Math.min(imagePaths.length, scenes.length);
  const sceneDurations = [];

  for (let i = 0; i < totalScenes; i++) {
    const scene = scenes[i];
    const timeMatch = scene.time.match(/(\d+)-(\d+)/);
    if (timeMatch) {
      const start = parseInt(timeMatch[1]);
      const end = parseInt(timeMatch[2]);
      sceneDurations.push(end - start);
    } else {
      sceneDurations.push(Math.floor(clampedDuration / totalScenes));
    }
  }

  // Scale durations to match actual audio
  const totalPlanned = sceneDurations.reduce((a, b) => a + b, 0);
  const scale = clampedDuration / totalPlanned;
  const scaledDurations = sceneDurations.map(d => Math.max(1.5, d * scale));

  for (let i = 0; i < totalScenes; i++) {
    const imgPath = imagePaths[i];
    const clipPath = path.join(tempDir, `clip_${RUN_ID}_${i}.mp4`);
    const dur = scaledDurations[i].toFixed(2);
    const totalFrames = Math.ceil(scaledDurations[i] * fps);

    // Alternate Ken Burns: zoom in vs zoom out for visual variety
    const isZoomIn = i % 2 === 0;
    const zoomFilter = isZoomIn
      ? `zoompan=z='min(zoom+0.002,1.35)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}`
      : `zoompan=z='if(lte(zoom,1.0),1.35,max(1.001,zoom-0.002))':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}`;

    const cmd = [
      ffmpegCmd, '-y',
      '-loop', '1', '-i', `"${imgPath}"`,
      `-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${zoomFilter},format=yuv420p"`,
      '-c:v libx264 -preset fast -pix_fmt yuv420p',
      '-an',
      `-t ${dur}`,
      `"${clipPath}"`,
    ].join(' ');

    try {
      execSync(cmd, { stdio: 'pipe', timeout: 60000 });
      clipPaths.push(clipPath);
    } catch (e) {
      log('⚠️', `Clip ${i} render failed: ${e.message}`);
    }
  }

  if (clipPaths.length === 0) {
    log('⚠️', 'All clips failed. Falling back to single image.');
    return composeSingleImage(ffmpegCmd, audioPath, imagePaths[0], clampedDuration, fps, outPath);
  }

  // Concatenate clips
  const concatFile = path.join(tempDir, `concat_${RUN_ID}.txt`);
  fs.writeFileSync(concatFile, clipPaths.map(p => `file '${p}'`).join('\n'));

  const silentVideoPath = path.join(tempDir, `silent_${RUN_ID}.mp4`);

  execSync(
    `${ffmpegCmd} -y -f concat -safe 0 -i "${concatFile}" -c:v copy "${silentVideoPath}"`,
    { stdio: 'pipe', timeout: 60000 }
  );

  // Mux audio + concatenated video
  execSync([
    ffmpegCmd, '-y',
    '-i', `"${silentVideoPath}"`,
    '-i', `"${audioPath}"`,
    '-map', '0:v', '-map', '1:a',
    '-c:v copy',
    '-c:a aac -ar 44100 -ac 2 -b:a 192k',
    '-shortest',
    `-t ${clampedDuration.toFixed(2)}`,
    `"${outPath}"`,
  ].join(' '), { stdio: 'pipe', timeout: 60000 });

  // Cleanup temp clips
  for (const f of [...clipPaths, concatFile, silentVideoPath]) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }

  validateOutput(outPath, clampedDuration);
  return outPath;
}

function composeSingleImage(ffmpegCmd, audioPath, imgPath, duration, fps, outPath) {
  const totalFrames = Math.ceil(duration * fps);
  const zoomFilter = `zoompan=z='min(zoom+0.001,1.3)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}`;
  const videoFilter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${zoomFilter},format=yuv420p`;

  execSync([
    ffmpegCmd, '-y',
    '-loop', '1', '-i', `"${imgPath}"`,
    '-i', `"${audioPath}"`,
    '-map', '0:v', '-map', '1:a',
    `-vf "${videoFilter}"`,
    '-c:v libx264 -preset fast -pix_fmt yuv420p',
    '-c:a aac -ar 44100 -ac 2 -b:a 192k',
    `-t ${duration.toFixed(2)}`,
    '-shortest',
    `"${outPath}"`,
  ].join(' '), { stdio: 'pipe', timeout: 120000 });

  validateOutput(outPath, duration);
  return outPath;
}

function validateOutput(outPath, duration) {
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 50000) {
    throw new Error('FFmpeg produced corrupt or empty output');
  }
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  log('✅', `Video rendered: ${sizeMB} MB | Duration: ${duration.toFixed(1)}s`);
}

// ============================================
// 🎯 STAGE 6: PUBLISH TO FACEBOOK REELS
// ============================================
async function publishToFacebook(videoPath, caption, cta) {
  divider('STAGE 6: Facebook Reels Publishing');

  if (process.env.PUBLISH_ENABLED !== 'true') {
    log('⏸️', 'PUBLISH_ENABLED is not true. Simulating publish...');
    log('📋', `Caption: ${caption.slice(0, 150)}...`);
    return { simulated: true };
  }

  if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_ACCESS_TOKEN) {
    log('⚠️', 'Missing FB credentials. Skipping publish.');
    return { skipped: true };
  }

  try {
    const initRes = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/video_reels?upload_phase=start&access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`
    );
    const videoId = initRes.data.video_id;
    const uploadUrl = initRes.data.upload_url;
    log('📤', `Upload initialized. Video ID: ${videoId}`);

    const fileBuffer = fs.readFileSync(videoPath);
    await axios.post(uploadUrl, fileBuffer, {
      headers: {
        'Authorization': `OAuth ${process.env.FB_PAGE_ACCESS_TOKEN}`,
        'offset': '0',
        'file_size': fileBuffer.length.toString(),
      },
    });
    log('📤', 'Video uploaded');

    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/video_reels?upload_phase=finish&video_id=${videoId}&video_state=PUBLISHED&description=${encodeURIComponent(caption)}&access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`
    );
    log('✅', `Published to Facebook Reels! Video ID: ${videoId}`);

    // Drop CTA as first comment (algorithmic optimization)
    if (cta) {
      try {
        await axios.post(`https://graph.facebook.com/v19.0/${videoId}/comments`, {
          message: `${cta}\n\n👉 https://nadaniadigitalllc.com/wellness`,
          access_token: process.env.FB_PAGE_ACCESS_TOKEN,
        });
        log('💬', 'CTA comment injected');
      } catch (cErr) {
        log('⚠️', `Comment failed: ${cErr.message}`);
      }
    }

    return { videoId, published: true };
  } catch (e) {
    log('❌', `Publish failed: ${e.message}`);
    return { error: e.message };
  }
}

// ============================================
// 🎯 STAGE 7: DB MEMORY COMMIT
// ============================================
async function commitToDb(conn, topicData, payload, publishResult) {
  if (!conn) return;
  divider('STAGE 7: Memory Commit');

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS viral_clips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        run_id VARCHAR(100),
        topic_id INT,
        topic TEXT,
        hook TEXT,
        script TEXT,
        scenes_json TEXT,
        caption TEXT,
        cta TEXT,
        emotion_score INT,
        viral_score INT,
        viral_reason TEXT,
        post_id VARCHAR(100),
        status VARCHAR(30) DEFAULT 'generated',
        duration_sec FLOAT,
        scene_count INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(
      `INSERT INTO viral_clips (run_id, topic_id, topic, hook, script, scenes_json, caption, cta, emotion_score, viral_score, viral_reason, post_id, status, duration_sec, scene_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        RUN_ID,
        topicData.id || null,
        payload.topic || topicData.topic,
        payload.hook,
        payload.script,
        JSON.stringify(payload.scenes),
        payload.caption,
        payload.cta,
        payload.emotion_score || 0,
        payload.viral_score || 0,
        payload.viral_reason || null,
        publishResult?.videoId || null,
        publishResult?.published ? 'posted' : 'generated',
        MAX_DURATION_SEC,
        payload.scenes?.length || 0,
      ]
    );

    if (topicData.id) {
      await conn.execute(
        "UPDATE health_reels_queue SET status = ?, locked_by = NULL, posted_at = CURRENT_TIMESTAMP WHERE id = ?",
        [publishResult?.published ? 'posted' : 'clip_generated', topicData.id]
      );
    }

    log('💾', 'Clip metadata + scenes committed to DB');
  } catch (e) {
    log('⚠️', `DB commit failed: ${e.message}`);
  }
}

// ============================================
// 🚀 MAIN PIPELINE
// ============================================
async function main() {
  console.log('\n' + '═'.repeat(60));
  log('🔥', `VIRAL CLIP GENERATOR v2.0 (MASTER ENGINE) | Run: ${RUN_ID}`);
  log('⏱️', `Max Duration: ${MAX_DURATION_SEC}s | Format: 9:16 | Multi-Scene`);
  console.log('═'.repeat(60));

  const startTime = Date.now();
  let conn = null;

  const tempDir = os.tmpdir();
  const audioPath = path.join(tempDir, `viral_tts_${RUN_ID}.mp3`);
  const outPath = path.join(tempDir, `viral_clip_${RUN_ID}.mp4`);

  const localOutputDir = path.join(process.cwd(), 'output', 'viral_clips');
  fs.mkdirSync(localOutputDir, { recursive: true });
  const localOutPath = path.join(localOutputDir, `viral_${new Date().toISOString().slice(0, 10)}_${RUN_ID.slice(0, 8)}.mp4`);

  try {
    // DB connection (optional)
    try {
      conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'), ssl: { rejectUnauthorized: false },
      });
      log('🔌', 'Database connected');
    } catch { log('⚠️', 'No DB. Standalone mode.'); }

    // STAGE 1: Topic
    const topicData = await selectTopic(conn);

    // STAGE 2: Master Viral Script (5-phase with scenes)
    const payload = await generateViralScript(topicData.topic);

    // STAGE 3: TTS Voiceover
    await generateVoiceover(payload.script, audioPath);

    // STAGE 4: Multi-Scene Images
    const imagePaths = await generateSceneImages(payload.scenes, tempDir);

    // STAGE 5: Multi-Scene Video Composition
    composeMultiSceneVideo(audioPath, imagePaths, payload.scenes, outPath);

    // Copy to local output
    fs.copyFileSync(outPath, localOutPath);
    log('📁', `Local copy: ${localOutPath}`);

    // STAGE 6: Publish
    const publishResult = await publishToFacebook(outPath, payload.caption, payload.cta);

    // STAGE 7: DB Commit
    await commitToDb(conn, topicData, payload, publishResult);

    // ═══ FINAL SUMMARY ═══
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '═'.repeat(60));
    log('🎉', 'VIRAL CLIP v2.0 PIPELINE COMPLETE');
    console.log('═'.repeat(60));
    log('📌', `Topic: ${payload.topic || topicData.topic}`);
    log('🪝', `Hook: "${payload.hook}"`);
    log('🎬', `Scenes: ${payload.scenes.length} (${payload.scenes.map(s => s.phase).join(' → ')})`);
    log('💯', `Viral Score: ${payload.viral_score}/100 | Emotion: ${payload.emotion_score}/10`);
    log('⏱️', `Duration: ≤${MAX_DURATION_SEC}s`);
    log('📁', `Video: ${localOutPath}`);
    log('⏲️', `Pipeline: ${totalTime}s`);
    if (publishResult?.videoId) log('🚀', `FB Video ID: ${publishResult.videoId}`);
    console.log('═'.repeat(60) + '\n');

    await sendDiscordNotification(
      '🔥 Viral Clip v2.0 Published!',
      `Hook: "${payload.hook}"\nScenes: ${payload.scenes.length}\nViral: ${payload.viral_score}/100\nEmotion: ${payload.emotion_score}/10`,
    );

  } catch (err) {
    console.error('\n❌ PIPELINE FATAL ERROR:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    await sendDiscordNotification('❌ Viral Clip Failed', err.message, 16711680);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
    // Cleanup temp files (keep scene images for debugging)
    try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch {}
  }
}

main();
