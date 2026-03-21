import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mysql from 'mysql2/promise';

async function check() {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    const [cols] = await conn.execute("SHOW COLUMNS FROM normalized_deals");
    console.log(cols.map(c => c.Field));
    await conn.end();
}
check();
