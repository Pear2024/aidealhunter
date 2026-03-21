require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function seed() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    });

    const dummyHtml1 = `
        <p>Listen up: if you’re living in the Inland Empire and you aren’t using these secret Amazon hacks, you are literally throwing cash out the window every single month.</p>
        <h2>The "Hidden Clearance" URL Trick</h2>
        <p>Amazon has a secret clearance section that 99% of shoppers ignore. All you have to do is type <strong>&pct-off=50-</strong> at the end of any search URL. Instantly, you’re looking at items mathematically discounted by half.</p>
        <ul>
            <li>Works perfectly for tech gadgets</li>
            <li>Incredible for household basics</li>
            <li>Saves you tons on summer road trip gear</li>
        </ul>
        <h3>Why Hemet Residents Need This</h3>
        <p>Living out here means we rely on delivery more than anyone. Combine this with Prime, and you've basically hacked the system.</p>
    `;

    const dummyHtml2 = `
        <p>The summer heat in Riverside County is no joke. But here’s the crazy part: keeping your house ice cold doesn’t have to cost $400 a month in electric bills.</p>
        <h2>Smart Thermostats: The Real ROI</h2>
        <p>If you don't have a smart thermostat yet, stop what you are doing. The <strong>Google Nest</strong> or <strong>Ecobee</strong> can learn your habits. It shuts off when you leave for work in Riverside and cools down exactly 10 minutes before you pull into your driveway.</p>
        <h2>Thermal Blackout Curtains</h2>
        <p>This is the cheapest hack in the book. Go on Amazon and buy 100% blackout thermal curtains. They block the UV radiation from baking your living room, instantly dropping the ambient temperature by 5-10 degrees.</p>
        <p>Stay cool out there, IE!</p>
    `;

    try {
        await conn.execute(
            `INSERT INTO ai_blog_posts (slug, title, content_html, image_url, created_at) VALUES (?, ?, ?, ?, NOW())`,
            ['amazon-clearance-hack-ie', 'Secret Amazon Hacks for Inland Empire Shoppers', dummyHtml1, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80']
        );
        console.log("✅ Seeded Blog 1");

        await conn.execute(
            `INSERT INTO ai_blog_posts (slug, title, content_html, image_url, created_at) VALUES (?, ?, ?, ?, NOW())`,
            ['survive-ie-summer-heat-smart-tech', 'How to Survive IE Summers on a Budget', dummyHtml2, 'https://images.unsplash.com/photo-1512756290469-ec264b7fbf87?auto=format&fit=crop&w=1200&q=80']
        );
        console.log("✅ Seeded Blog 2");
    } catch(e) { console.log(e); }
    
    await conn.end();
}
seed();
