const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

ffmpeg()
    .input('color=c=red:s=1080x1920:d=5')
    .inputFormat('lavfi')
    .outputOptions([
        '-vf', `scale=1080:-1,zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',scale=1080:1920,crop=1080:1920,drawtext=fontfile=/Library/Fonts/Arial.ttf:text='Test':fontcolor=yellow:fontsize=60:x=10:y=10`,
        '-c:v', 'libx264', '-t', '5'
    ])
    .on('end', () => console.log('Success!'))
    .on('error', (err) => console.error('Error:', err.message))
    .save('/tmp/test_out.mp4');
