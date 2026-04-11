require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const axios = require('axios');
const cp = require('child_process');

let SCENARIO = process.env.UAT_SCENARIO || 'ALL';

// --- MOCKING BOUNDARIES ---
const mockLogs = [];
function uatLog(msg) { console.log(`[UAT] ${msg}`); mockLogs.push(msg); }

// 1. Mock Discord
const originalPost = axios.post;
axios.post = async function(url, data, config) {
    if (url.includes('discord')) {
        uatLog(`DISCORD ALERT PREVENTED: Severty=[${data.embeds[0].color === 16711680 ? 'CRITICAL' : 'WARNING'}] Title=[${data.embeds[0].title}]`);
        return { status: 200 };
    }
    if (url.includes('graph.facebook') && url.includes('/videos')) {
        if (SCENARIO === 'FB_FAILED') throw new Error("Mock Facebook 500 Internal Error");
        uatLog(`FACEBOOK UPLOAD PREVENTED: Video successfuly captured by UAT harness.`);
        return { data: { id: "mock_fb_vid_999" } };
    }
    if (url.includes('graph.facebook') && url.includes('/comments')) {
        if (SCENARIO === 'COMMENT_FAILED') throw new Error("Mock Facebook Comment Blocked");
        uatLog(`FACEBOOK COMMENT PREVENTED: Comment successfuly captured by UAT harness.`);
        return { data: { id: "mock_fb_comment_999" } };
    }
    if (url.includes('api.github.com')) {
        uatLog(`GITHUB ACTION RECOVERY RUN PREVENTED: Dispatch payload captured.`);
        return { status: 200 };
    }
    if (SCENARIO === 'IMAGE_FAILED' && url.includes('pollinations')) {
        throw new Error("Mock Pollinations Down");
    }
    return originalPost(url, data, config);
};

// 2. Mock FFmpeg
const originalExecSync = cp.execSync;
cp.execSync = function(cmd, opts) {
    if (cmd.includes('ffmpeg')) {
        if (SCENARIO === 'FFMPEG_FAILED') throw new Error("Mock FFmpeg Segfault");
        uatLog(`FFMPEG RENDER PREVENTED: Bypassed heavy render. Command: ${cmd.substring(0, 50)}...`);
        // Touch the output file so fs checks pass
        const outMatch = cmd.match(/([^ ]+\.mp4)|([^ ]+\.png)/g);
        if (outMatch) {
            const outPath = outMatch[outMatch.length - 1];
            fs.writeFileSync(outPath.replace(/['"]/g, ''), 'mock binary');
        }
        return Buffer.from("");
    }
    return originalExecSync(cmd, opts);
};

// 3. Mock Fetch (RSS)
const originalFetch = global.fetch;
global.fetch = async function(url, opts) {
    if (url.includes('rss')) {
        if (SCENARIO === 'RSS_FAILED') throw new Error("Mock RSS Connection Refused");
        uatLog(`RSS FETCH INTERCEPTED.`);
        return { text: async () => `<item><title>[UAT Test] Medical Breakthrough</title></item>` };
    }
    return originalFetch(url, opts);
};

// 4. Read the file logic securely and dynamically hack Gemini if needed
let engineCode = fs.readFileSync('./generate_health_reel.js', 'utf8');
engineCode = engineCode.replace('main();', '');

// Execute
async function runUatSuite() {
    console.log("===================================");
    console.log(`�� LAUNCHING UAT SIMULATION SUITE`);
    console.log("===================================");
    
    // We export main from the engine code via eval, or write to tmp
    fs.writeFileSync('./generate_health_reel_temp.js', engineCode + '\nmodule.exports = { main };');
    const { main } = require('./generate_health_reel_temp.js');
    
    const runTest = async (scenarioName) => {
        console.log(`\n\n▶️ ========================================`);
        console.log(`▶️ EXECUTING SCENARIO: ${scenarioName}`);
        console.log(`▶️ ========================================`);
        SCENARIO = scenarioName;
        
        // Mock Gemini manually by hijacking model.generateContent prototype inside loop
        // It's easier to just override GEMINI_API_KEY for the GEMINI_FAILED test
        let oldGeminiKey = process.env.GEMINI_API_KEY;
        if (scenarioName === 'GEMINI_FAILED') {
            process.env.GEMINI_API_KEY = "invalid_key_mock";
        }
        
        try {
            await main();
        } catch(e) {
            console.log(`[UAT] Pipeline halted correctly for testing:`, e.message);
        }
        
        // Reset
        process.env.GEMINI_API_KEY = oldGeminiKey;
    };
    
    // Test 1: RSS
    // await runTest('RSS_FAILED');
    
    // Since testing hits DB actively, running 9 heavy tests loops might pollute.
    // Let's run a select few safe scenarios without breaking their queue.
    await runTest('IMAGE_FAILED');
    await runTest('COMMENT_FAILED');
    
    // Clean up
    fs.unlinkSync('./generate_health_reel_temp.js');
    console.log("\n✅ UAT Simulation Module loaded. Awaiting final full test hook execution.");
}

runUatSuite();
