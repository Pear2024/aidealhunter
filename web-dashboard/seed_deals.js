const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const DUMMY_PRODUCTS = [
  { brand: 'Apple', title: 'MacBook Pro 16" M3 Max - 36GB RAM, 1TB SSD', original_price: 3499.00, discount_price: 2999.00, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800', url: 'https://amazon.com' },
  { brand: 'Sony', title: 'PlayStation 5 Console (Disc Edition)', original_price: 499.99, discount_price: 449.99, img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800', url: 'https://bestbuy.com' },
  { brand: 'Samsung', title: '65" Class OLED 4K S90C Series Smart TV', original_price: 2599.99, discount_price: 1599.99, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800', url: 'https://samsung.com' },
  { brand: 'Nintendo', title: 'Nintendo Switch OLED Model - Neon', original_price: 349.99, discount_price: 299.99, img: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&q=80&w=800', url: 'https://target.com' },
  { brand: 'Apple', title: 'iPad Pro 11-inch (M4) 256GB Wi-Fi', original_price: 999.00, discount_price: 899.00, img: 'https://images.unsplash.com/photo-1544244015-0da017d3cdcb?auto=format&fit=crop&q=80&w=800', url: 'https://amazon.com' }
];

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 25060,
  });

  try {
    console.log("Generating 100 placeholder deals...");
    await connection.execute(`DELETE FROM normalized_deals WHERE title LIKE '%[DEMO]%'`);

    let count = 0;
    
    for(let i=0; i < 100; i++) {
       const [rawInsert] = await connection.execute(
          `INSERT INTO raw_deals (source_url, title, raw_content, published_at) VALUES (?, ?, ?, NOW())`,
          [`https://seed.test/item/${Date.now()}/${i}`, `Seed Parent ${i}`, '<html>Seed Data</html>']
       );
       const validRawDealId = rawInsert.insertId;

       const baseTemplate = DUMMY_PRODUCTS[i % DUMMY_PRODUCTS.length];
       const variationId = Math.floor(i / DUMMY_PRODUCTS.length) + 1;
       
       const title = `[DEMO] ${baseTemplate.title} (Batch-${variationId})`;
       const url = baseTemplate.url;
       const originalPrice = baseTemplate.original_price;
       const discountPrice = parseFloat((baseTemplate.discount_price - (Math.random() * 20)).toFixed(2));
       const brand = baseTemplate.brand;
       const img = baseTemplate.img;
       
       const rawDealId = validRawDealId;
       
       const status = 'approved';
       const confidence_score = 0.95;
       const merchandiser_score = Math.floor(Math.random() * 100);
       const vote_score = Math.floor(Math.random() * 50) + 10;
       const ab_variant = 'A';

       const query = `
          INSERT INTO normalized_deals 
          (raw_deal_id, title, url, original_price, discount_price, brand, image_url, status, confidence_score, merchandiser_score, vote_score, ab_variant)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `;

       await connection.execute(query, [
          rawDealId, title, url, originalPrice, discountPrice, brand, img, status, confidence_score, merchandiser_score, vote_score, ab_variant
       ]);
       count++;
    }

    console.log(`✅ Successfully inserted ${count} approved placeholder products!`);
    
  } catch (err) {
    console.error("❌ Error inserting deals:", err.message);
  } finally {
    await connection.end();
  }
}

seedDatabase();
