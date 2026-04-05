const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000/studio', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: '/tmp/screenshot.png' });
    console.log('Saved screenshot to /tmp/screenshot.png');
    
    // Evaluate and print out nextjs error boundary text if any
    const errorText = await page.evaluate(() => {
      return document.querySelector('body')?.innerText || 'No body';
    });
    console.log('BODY TEXT:', errorText.substring(0, 500));
  } catch (err) {
    console.log('Failed to load:', err.message);
  }

  await browser.close();
})();
