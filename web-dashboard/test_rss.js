const Parser = require('rss-parser');
const cheerio = require('cheerio');
const parser = new Parser({
    customFields: {
        item: ['content:encoded']
    }
});

parser.parseURL('https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=apple').then(feed => {
    feed.items.forEach(deal => {
        if (deal.title.toLowerCase().includes('amazon')) {
            const html = deal['content:encoded'] || deal.content;
            const $ = cheerio.load(html);
            console.log('--- DEAL:', deal.title, '---');
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('amazon.com')) {
                   console.log('Amazon Link:', href);
                }
            });
        }
    });
});
