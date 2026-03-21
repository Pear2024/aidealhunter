require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function migrate() {
    console.log("Connecting to Database...");
    
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS ai_blog_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slug VARCHAR(255) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                content_html TEXT NOT NULL,
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table ai_blog_posts created successfully.");
        
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS blog_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_name VARCHAR(100) NOT NULL,
                user_id VARCHAR(100),
                comment_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES ai_blog_posts(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table blog_comments created successfully.");
    } catch(e) {
        console.error("❌ Migration Failed:", e);
    } finally {
        await conn.end();
    }
}
migrate();
