import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max Vercel hobby duration

export async function GET(request) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const providedKey = searchParams.get('key');
        const secretKey = process.env.CRON_SECRET_KEY;
        
        if (secretKey && providedKey !== secretKey && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ASSOCIATE_ID = "1712892"; // Nipa3

        // Define the core product catalog for Three International
        const threeProducts = [
            { title: "Three International Vitalité (Superfood Blend & Multivitamin)", price: 75.00, url_suffix: "/2802/US", img: "https://threeinternational.com/assets/images/products/vitalite.png" },
            { title: "Three International Imúne (Total Body Immune Support)", price: 70.00, url_suffix: "/2803/US", img: "https://threeinternational.com/assets/images/products/imune.png" },
            { title: "Three International Éternel (Advanced Antioxidant Blend)", price: 100.00, url_suffix: "/2797/US", img: "https://threeinternational.com/assets/images/products/eternel.png" },
            { title: "Three International Revíve (Renewal & Recovery)", price: 72.00, url_suffix: "/2799/US", img: "https://threeinternational.com/assets/images/products/revive.png" },
            { title: "Three International Purifí (Daily Whole-Body Detox)", price: 70.00, url_suffix: "/2801/US", img: "https://threeinternational.com/assets/images/products/purifi.png" },
            { title: "Three International Collagène (Marine Sourced Collagen)", price: 70.00, url_suffix: "/2798/US", img: "https://threeinternational.com/assets/images/products/collagene.png" },
            { title: "Three International GLP THREE (Metabolic Support)", price: 85.00, url_suffix: "/3478/US", img: "https://threeinternational.com/assets/images/products/glp.png" },
            { title: "Three International Pure Cleanse", price: 75.00, url_suffix: "/3092/US", img: "https://threeinternational.com/assets/images/products/cleanse.png" },
            { title: "Three International Radiant Toner", price: 75.00, url_suffix: "/3093/US", img: "https://threeinternational.com/assets/images/products/toner.png" }
        ];
        
        // Shuffle and pick 2 random products to "discover"
        const shuffled = [...threeProducts].sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, 2);
        
        console.log(`🚀 Dispatching Discovery Agent for Three International products...`);
        connection = await getConnection();

        let addedCount = 0;
        for (const item of selectedProducts) {
            const affiliateUrl = `https://threeinternational.com/en/productdetail/${ASSOCIATE_ID}${item.url_suffix}`;
            
            // Generate a fake "original MSRP" to create a "Deal" illusion
            const fakeDiscountPerc = Math.floor(Math.random() * 15) + 10; // 10% to 25% off
            const originalPrice = parseFloat((item.price / (1 - (fakeDiscountPerc / 100))).toFixed(2));

            // Avoid adding the exact same deal URL if it's currently 'idle'
            const [existing] = await connection.execute('SELECT id FROM normalized_deals WHERE url = ? AND fb_status IN ("idle", "processing")', [affiliateUrl]);
            if (existing.length === 0) {
                await connection.execute(
                    `INSERT INTO normalized_deals (
                        title, brand, original_price, discount_price, 
                        url, status, fb_status, submitter_id, vote_score, merchandiser_score, image_url
                    ) VALUES (?, 'Three International', ?, ?, ?, 'approved', 'idle', 'agent_discovery', 100, 100, ?)`,
                    [item.title, originalPrice, item.price, affiliateUrl, item.img]
                );
                addedCount++;
            }
        }
        
        console.log(`✅ Discovery Agent finished. Inserted ${addedCount} Three International products.`);

        return NextResponse.json({ 
            success: true, 
            message: `Discovery Agent ran successfully, queued ${addedCount} products for Nipa3.`
        });

    } catch (error) {
        console.error("Discovery Agent Fault:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e) {}
        }
    }
}
