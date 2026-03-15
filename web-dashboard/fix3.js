const fs = require('fs');
let code = fs.readFileSync('run_local_agent.js', 'utf8');

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync('run_local_agent.js', code);
console.log('Fixed backticks and template string variables in run_local_agent.js');
