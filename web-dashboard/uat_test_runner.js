require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const axios = require('axios');
const cp = require('child_process');

console.log("==========================================");
console.log("🛡️ NADANIA AI - FULL UAT MOCK RUNNER 🛡️");
console.log("==========================================");

// 1. MOCK DISCORD & FACEBOOK AXIOM CALLS
const originalAxiosPost = axios.post;
axios.post = async function(url, data, config) {
    if (url.includes('discord')) {
        console.log(`[MOCK ALERT SUPPRESSED] Discord Webhook intercepted. Severity: ${data.embeds[0].color === 16711680 ? 'CRITICAL' : 'WARNING'}`);
        return { status: 200 };
    }
    if (url.includes('graph.facebook.com/v19.0/') && url.includes('/videos')) {
        if (process.env.TEST_SCENARIO === 'FB_UPLOAD_FAIL') throw new Error("Mock Facebook 500 API Reject");
        console.log(`[MOCK FB UPLOAD] Video cleanly intercepted before Meta processing.`);
        return { data: { id: "mock_fb_vid_999" } };
    }
    if (url.includes('/comments')) {
        if (process.env.TEST_SCENARIO === 'COMMENT_FAIL') throw new Error("Mock Comment Injection Failed");
        console.log(`[MOCK FB COMMENT] CTA Comment safely intercepted.`);
        return { data: { id: "mock_fb_comment_999" } };
    }
    if (url.includes('api.github.com/repos/')) {
        console.log(`[MOCK GHA DISPATCH] GitHub Recovery Auto-Run trigger intercepted.`);
        return { status: 200 };
    }
    return originalAxiosPost(url, data, config);
};

// 2. MOCK FFMPEG & POLLINATIONS
const originalExecSync = cp.execSync;
cp.execSync = function(cmd, opts) {
    if (cmd.includes('ffmpeg')) {
        if (process.env.TEST_SCENARIO === 'FFMPEG_FAIL') throw new Error("Mock FFmpeg Segfault 11");
        console.log(`[MOCK FFMPEG] Bypassed heavy local video rendering.`);
        // Drop a fake file to pass the FS stream check
        const match = cmd.match(/([^ ]+\.mp4)|([^ ]+\.png)/g);
        if (match) fs.writeFileSync(match[match.length-1].replace(/['"]/g, ''), 'mock binary buffer');
        return Buffer.from("");
    }
    return originalExecSync(cmd, opts);
};

// 3. MOCK RSS
const originalFetch = global.fetch;
global.fetch = async function(url, opts) {
    if (url.includes('news.google.com/rss')) {
        if (process.env.TEST_SCENARIO === 'RSS_FAIL') throw new Error("Mock DNS Resolution Failed");
        console.log(`[MOCK RSS] Ingested fake medical topic.`);
        return { text: async () => `<item><title>[UAT Test] Medical Breakthrough</title></item>` };
    }
    return originalFetch(url, opts);
};

// Injection Bootstrapper
let realCode = fs.readFileSync(__dirname + '/generate_health_reel.js', 'utf8');
realCode = realCode.replace('main();', `
    module.exports = { executePipeline: main };
`);
fs.writeFileSync(__dirname + '/generate_health_reel_mocked.js', realCode);
const { executePipeline } = require('./generate_health_reel_mocked.js');

async function runScenario(scenarioName) {
    console.log(`\n\n▶️ ========================================`);
    console.log(`▶️ EXECUTING SCENARIO: ${scenarioName}`);
    console.log(`▶️ ========================================`);
    process.env.TEST_SCENARIO = scenarioName;
    
    // Test Injection
    let oldKey = process.env.GEMINI_API_KEY;
    if (scenarioName === 'GEMINI_FAIL') process.env.GEMINI_API_KEY = "corrupted_mock_key";
    
    try {
        await executePipeline();
    } catch(e) {
        console.log(`[UAT SUITE] Pipeline Exited Safely. Final Error: ${e.message}`);
    }
    process.env.GEMINI_API_KEY = oldKey;
}

// Suite Execution
(async () => {
    // Avoid running standard MySQL tests locally in block since DB states persist
    // This is the active testing structure requested for isolating functions safely.
    console.log("Mock Runner fully initialized. Ready for parameter-based dry runs.");
})();
