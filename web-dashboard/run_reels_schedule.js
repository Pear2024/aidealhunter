require('dotenv').config({ path: '.env.local' });
const cron = require('node-cron');
const { exec } = require('child_process');

console.log("⏰ Facebook Auto-Reels Scheduler Initialized!");
console.log("📅 Scheduled Times: 10:00, 15:00, 20:00 daily");

function triggerReelGeneration() {
    console.log(`[${new Date().toLocaleString()}] 🚀 Triggering generate_reel.js...`);
    exec('node generate_reel.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Execution Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ STDERR: ${stderr}`);
        }
        console.log(`✅ Reel Generation Complete! Output:\n${stdout}`);
    });
}

// Run 3 times a day
cron.schedule('0 10 * * *', triggerReelGeneration); // 10:00 AM
cron.schedule('0 15 * * *', triggerReelGeneration); // 3:00 PM
cron.schedule('0 20 * * *', triggerReelGeneration); // 8:00 PM

console.log("✅ CRON Daemon is active. Leave this terminal open to automatically post 3 Reels per day.");
