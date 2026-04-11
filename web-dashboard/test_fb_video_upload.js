const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { execSync } = require('child_process');

// 1. Create a dummy 1-second video
try {
  execSync('ffmpeg -y -f lavfi -i color=c=blue:s=1080x1920:d=2 -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -shortest dummy_test.mp4', { stdio: 'ignore' });
  console.log('✅ Created dummy_test.mp4');
} catch(e) {
  console.log('Error creating video', e.message);
  process.exit(1);
}

// 2. Upload to Facebook
const token = 'EABxK8ZCbcpcABP4JxmZCFlgBtkDZBqOY7WUtbrQzu9I53cTraRb0W2DpJ5XxD0qmJP33qZCTFttW47nPlHL4ax3IXXrYbw36KZAkmAmZCqgNZAVHQVa2jx2WRfuL7D2ProljK8jMZA7PZAAzMzjjeCcZCtzJFSTAu7bAp1gyg49x0vhppI2gMwupQhNtFN2GcIrpEj7PFaz5fIajjXtg6veIpNxWEZD';
const pageId = '106543408858789';

async function upload() {
  try {
    const form = new FormData();
    form.append('access_token', token);
    form.append('description', '🧪 Test Video Post Upload - ' + new Date().toISOString());
    form.append('source', fs.createReadStream('dummy_test.mp4'));

    console.log('🚀 Uploading to Facebook Page ID:', pageId);
    const response = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/videos`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000
    });
    
    console.log('🎉 Upload Success!', response.data);
  } catch (err) {
    console.error('❌ Upload Error:', err.response?.data || err.message);
  }
}

upload();
