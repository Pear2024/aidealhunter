const { getConnection } = require('./lib/db');
require('dotenv').config({ path: '.env.local' });
async function wipeBlogs() {
  const c = await getConnection();
  await c.query('SET FOREIGN_KEY_CHECKS = 0;');
  await c.query('DELETE FROM ai_blog_posts;').catch(e=>console.log(e.message));
  await c.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log("Wiped ai_blog_posts");
  c.end();
  process.exit(0);
}
wipeBlogs();
