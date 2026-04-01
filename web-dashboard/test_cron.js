require('dotenv').config({ path: '.env.local' });
async function test() {
  const fetch = require('node-fetch');
  const res = await fetch('http://localhost:3000/api/cron/health-content?key=super_secret_ai_cron_password_123');
  const data = await res.json();
  console.log(data);
}
test();
