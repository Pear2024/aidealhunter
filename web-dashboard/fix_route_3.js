const fs = require('fs');
let code = fs.readFileSync('app/api/cron/deals/route.js', 'utf8');

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync('app/api/cron/deals/route.js', code);
console.log('Fixed backticks and template string variables in route.js');
