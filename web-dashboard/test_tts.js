require('dotenv').config({ path: '.env.local' });
console.log(process.env.OPENAI_API_KEY.includes('"') ? "CONTAINS QUOTES" : "NO QUOTES");
