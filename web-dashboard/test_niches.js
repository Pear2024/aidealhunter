import Parser from 'rss-parser';
const parser = new Parser();
const categories = ['food', 'household', 'tech', 'travel'];
async function run() {
    for (const cat of categories) {
        console.log("\n=== Checking Category:", cat, "===");
        const feed = await parser.parseURL(`https://slickdeals.net/newsearch.php?mode=popular&searcharea=deals&searchin=first&rss=1&q=${cat}`);
        const items = feed.items.slice(0, 3);
        items.forEach((item, i) => {
            const hasAmazon = item.title.toLowerCase().includes('amazon');
            const hasPrice = /\$[0-9,.]+/.test(item.title);
            console.log(`[${i+1}] Title: ${item.title}`);
            console.log(`    -> Has 'amazon'? ${hasAmazon}`);
            console.log(`    -> Has Price? ${hasPrice}`);
        });
    }
}
run();
