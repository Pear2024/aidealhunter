const fs = require('fs');
let code = fs.readFileSync('test_regex.js', 'utf8');

const target1 = "title.match(/\\\\$([0-9,.]+)/)";
const replace1 = "title.match(/\\$([0-9,.]+)/)";

const target2 = "title.match(/(?:Or\\\\s)?(\\\\$[0-9.,]+\\\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i)";
const replace2 = "title.match(/(?:Or\\s)?(\\$[0-9.,]+\\/mo(?:\\s\\([0-9]+\\s*mo\\))?)/i)";

const target3 = "title.replace(/\\\\$([0-9,.]+)/, '').replace(/(?:Or\\\\s)?(\\\\$[0-9.,]+\\\\/mo(?:\\\\s\\\\([0-9]+\\\\s*mo\\\\))?)/i, '')";
const replace3 = "title.replace(/\\$([0-9,.]+)/, '').replace(/(?:Or\\s)?(\\$[0-9.,]+\\/mo(?:\\s\\([0-9]+\\s*mo\\))?)/i, '')";

code = code.replace(target1, replace1).replace(target2, replace2).replace(target3, replace3);

fs.writeFileSync('test_regex.js', code);
