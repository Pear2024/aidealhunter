const { execSync } = require('child_process');
execSync('curl -sL "https://office.threeinternational.com/downloads/en/Product-Price-Sheet-EN.pdf" -o test.pdf');
const fs = require('fs');
const b = fs.readFileSync('test.pdf');
console.log(b.slice(0, 50).toString());
