const https = require('https');

const ids = [24563, 24466, 24467, 24469, 24468, 24470, 24511, 24555, 24471];

ids.forEach(id => {
  https.get(`https://www.pdr.net/full-prescribing-information/hl/?druglabelid=${id}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const match = data.match(/<h1 class="[a-zA-Z\s-]*">([^<]+)<\/h1>/);
      if (match) {
        console.log(`${id}: ${match[1].trim()}`);
      } else {
        const altMatch = data.match(/<title>(.*?)<\/title>/);
        console.log(`${id}: Title -> ${altMatch ? altMatch[1] : 'Unknown'}`);
      }
    });
  });
});
