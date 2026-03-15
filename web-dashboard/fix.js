const fs = require('fs');
let code = fs.readFileSync('run_local_agent.js', 'utf8');

const targetStr = 'const installmentMatch = deal.title.match(/(?:Or\\\\s)?(\\\\$[0-9.,]+\\\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i);';
const replacementStr = 'const installmentMatch = deal.title.match(/(?:Or\\\\s)?(\\$[0-9.,]+\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i);';

const targetStr2 = `extracted.title = deal.title.replace(/\\\\$([0-9,.]+)/, '').replace(/(?:Or\\\\s)?(\\\\$[0-9.,]+\\\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i, '').replace(/ at Amazon| at Best Buy| at Walmart| at Target/i, '').trim();`;
const replacementStr2 = `extracted.title = deal.title.replace(/\\\\$([0-9,.]+)/, '').replace(/(?:Or\\\\s)?(\\$[0-9.,]+\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i, '').replace(/ at Amazon| at Best Buy| at Walmart| at Target/i, '').trim();`;

code = code.replace(targetStr, replacementStr);
code = code.replace(targetStr2, replacementStr2);

fs.writeFileSync('run_local_agent.js', code);
console.log('Fixed run_local_agent.js directly');
