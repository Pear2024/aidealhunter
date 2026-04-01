import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getDb() {
    return await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    });
}

export async function GET() {
    let conn;
    try {
        conn = await getDb();
        const [rows] = await conn.execute(`SELECT * FROM health_reels_queue ORDER BY status ASC, created_at DESC LIMIT 50`);
        return NextResponse.json(rows);
    } catch (error) {
        console.error("Queue Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (conn) await conn.end();
    }
}

export async function DELETE(req) {
    let conn;
    try {
        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get('id');
        if (!targetId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        conn = await getDb();
        await conn.execute("DELETE FROM health_reels_queue WHERE id = ?", [targetId]);
        
        return NextResponse.json({ success: true, message: "Queue item deleted" });
    } catch (error) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (conn) await conn.end();
    }
}
