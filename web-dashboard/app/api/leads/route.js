import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const pool = mysql.createPool({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT,
            waitForConnections: true,
            connectionLimit: 5,
        });

        const [rows] = await pool.query('SELECT * FROM wellness_leads ORDER BY created_at DESC');
        return new Response(JSON.stringify({ success: true, leads: rows }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
