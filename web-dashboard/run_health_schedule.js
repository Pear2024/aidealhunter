require('dotenv').config({ path: '.env.local' });
const cron = require('node-cron');
const { exec } = require('child_process');

console.log("⏰ Nadania Medical AI Auto-Reels Scheduler Initialized!");
console.log("📅 Scheduled Video Post Times: 08:00, 14:00, 20:00 daily");

function triggerHealthReel() {
    console.log(`[${new Date().toLocaleString()}] 🚀 Triggering generate_health_reel.js...`);
    exec('node generate_health_reel.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Execution Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ STDERR: ${stderr}`);
        }
        console.log(`✅ Health Reel Generation Complete! Output:\n${stdout}`);
    });
}

// Run 3 times a day (8 AM, 2 PM, 8 PM)
cron.schedule('0 8 * * *', triggerHealthReel); // Morning
cron.schedule('0 14 * * *', triggerHealthReel); // Afternoon
cron.schedule('0 20 * * *', triggerHealthReel); // Evening

console.log("✅ CRON Daemon is active. Leave this process running to automatically post 3 Health Reels to Facebook/Instagram per day.");
