const Parser = require('rss-parser');
const cheerio = require('cheerio');

async function testRSS() {
    const parser = new Parser({ customFields: { item: ['content:encoded'] }});
    const url = `https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=laptop`;
    const feed = await parser.parseURL(url);
    
    let deals = [];
    feed.items.forEach(deal => {
        const html = deal['content:encoded'] || deal.content;
        const $ = cheerio.load(html || '');
        let imgUrl = $('img').first().attr('src');
        deals.push({
            title: deal.title,
            imgUrl: imgUrl
        });
    });
    console.log(deals.slice(0, 3));
}
testRSS();
