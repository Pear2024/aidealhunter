const fs = require('fs');
let code = fs.readFileSync('app/api/cron/deals/route.js', 'utf8');

const target1 = "deal.title.match(/\\\\$([0-9,.]+)/)";
const replace1 = "deal.title.match(/\\$([0-9,.]+)/)";

const target2 = "deal.title.match(/(?:Or\\\\s)?(\\\\$[0-9.,]+\\\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i)";
const replace2 = "deal.title.match(/(?:Or\\s)?(\\$[0-9.,]+\\/mo(?:\\s\\([0-9]+\\s*mo\\))?)/i)";

const target3 = "deal.title.replace(/\\\\$([0-9,.]+)/, '').replace(/(?:Or\\\\s)?(\\\\$[0-9.,]+\\\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i, '')";
const replace3 = "deal.title.replace(/\\$([0-9,.]+)/, '').replace(/(?:Or\\s)?(\\$[0-9.,]+\\/mo(?:\\s\\([0-9]+\\s*mo\\))?)/i, '')";

code = code.replace(target1, replace1).replace(target2, replace2).replace(target3, replace3);

fs.writeFileSync('app/api/cron/deals/route.js', code);
console.log('Fixed regex in route.js');
