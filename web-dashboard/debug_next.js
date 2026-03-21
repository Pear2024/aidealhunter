const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting Next.js Server...');
const child = spawn('npm', ['run', 'start', '--', '-p', '3001']);

let serverReady = false;

child.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    
    if (!serverReady && (text.includes('Ready in') || text.includes('ready started') || text.includes('listening on'))) {
        serverReady = true;
        console.log('\n--- ⚡ SERVER READY, EXECUTING CURL ---');
        
        setTimeout(async () => {
            console.log('📡 Fetching /blog/[slug]...');
            try {
                const res = await fetch('http://localhost:3001/blog/inland-empire-smart-home-hacks-beat-heat-bills-933');
                console.log('📦 Fetch status:', res.status);
            } catch(err) {
                console.error('❌ Fetch error:', err.message);
            }
            
            setTimeout(() => {
                console.log('--- 🛑 KILLING SERVER ---');
                child.kill();
                process.exit(0);
            }, 3000);
        }, 1000);
    }
});

child.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
});
