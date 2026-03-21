require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function clean() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT || 25060,
        });

        console.log("Connected to Aiven MySQL. Purging old blog posts...");
        
        // Delete specifically the ones with "Beat the Heat" OR any pollinations image
        const [result] = await connection.execute(
            `DELETE FROM ai_blog_posts WHERE title LIKE '%Beat the Heat%' OR image_url LIKE '%pollinations.ai%'`
        );
        
        console.log(`✅ Success! Deleted ${result.affectedRows} obsolete blog posts.`);
        
    } catch (err) {
        console.error("Error cleaning DB:", err);
    } finally {
        if (connection) await connection.end();
    }
}
clean();
