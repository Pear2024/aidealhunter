const { getConnection } = require('./lib/db');
async function test() {
  const c = await getConnection();
  const [rows] = await c.query("SHOW TABLES LIKE 'articles'");
  console.log("Articles Table exists?", rows.length > 0);
  if (rows.length > 0) {
     const [cols] = await c.query("SHOW COLUMNS FROM articles");
     console.log(cols.map(c => c.Field));
  }
  process.exit(0);
}
test();
