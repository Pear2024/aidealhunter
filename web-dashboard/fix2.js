const fs = require('fs');
let code = fs.readFileSync('run_local_agent.js', 'utf8');

const targetStr = 'const installmentMatch = deal.title.match(/(?:Or\\\\s)?(\\\\$[0-9.,]+\\\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i);';
const replacementStr = 'const installmentMatch = deal.title.match(/(?:Or\\\\s)?(\\$[0-9.,]+\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i);';

code = code.replace(targetStr, replacementStr);

fs.writeFileSync('run_local_agent.js', code);
console.log('Fixed line 72');
