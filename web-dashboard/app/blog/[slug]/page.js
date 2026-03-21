import { getConnection } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Comments from './Comments'; 
import AdBanner from '@/app/components/AdBanner'; 

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    let slug = "unknown";
    try { slug = (await params).slug; } catch(e) { slug = params.slug; }
    let connection = null;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT title FROM ai_blog_posts WHERE slug = ?', [slug]);
        if (rows.length > 0) return { title: rows[0].title + " | IE Deal Hunter Blog" };
    } catch(e) { console.error(e); } finally { if (connection) await connection.end(); }
    return { title: "Blog Article" };
}

export default async function BlogPostPage({ params }) {
    let slug = "unknown";
    try { slug = (await params).slug; } catch(e) { slug = params.slug; }
    
    let post = null;
    let connection;
    let dbError = null;
    let debugRows = [];
    let rows = [];
    
    try {
        connection = await getConnection();
        [rows] = await connection.execute('SELECT * FROM ai_blog_posts WHERE slug = ?', [slug]);
        [debugRows] = await connection.execute('SELECT slug FROM ai_blog_posts LIMIT 10');
    } catch(err) {
        dbError = err.message;
        console.error("Vercel Edge DB Crash:", err);
    } finally {
        if (connection) {
            try { await connection.end(); } catch(e) {}
        }
    }

    if (dbError) {
        return (
            <div style={{ color: 'white', padding: '50px' }}>
                <h1 style={{ color: 'red' }}>Vercel Database Connection Error</h1>
                <p><strong>Error Message:</strong> {dbError}</p>
                <p>Next.js successfully routed to [slug], but PlanetScale/MySQL failed to connect on the edge.</p>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div style={{ color: 'white', padding: '50px' }}>
                <h1>Failed to find exact slug.</h1>
                <p><strong>Next.js Extracted URL Slug:</strong> &quot;{slug}&quot; | Length: {slug?.length}</p>
                <p><strong>Available Database Slugs:</strong></p>
                <ul>
                    {debugRows.map((r, i) => (
                        <li key={i}>&quot;{r.slug}&quot; | Length: {r.slug.length} | Match? {String(r.slug === slug)}</li>
                    ))}
                </ul>
            </div>
        );
    }
    post = rows[0];

    return (
        <main className="container fade-in">
            <Link href="/blog" style={{ color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', marginBottom: '20px', display: 'inline-block' }}>&larr; Back to Blog</Link>
            
            <article style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '3rem' }}>
                <div style={{ width: '100%', height: '400px', overflow: 'hidden' }}>
                     <img 
                         src={post.image_url} 
                         alt={post.title} 
                         style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                     />
                </div>
                <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
                    <p style={{ color: '#ff3366', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase' }}>
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', lineHeight: '1.2' }}>{post.title}</h1>
                    
                    <AdBanner dataAdSlot="top_article_slot" />
                    
                    <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.content_html }}></div>

                    <AdBanner dataAdSlot="bottom_article_slot" />
                </div>
            </article>

            {/* Community Engagement Section */}
            <section style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '15px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   💬 Community Discussion
                </h2>
                <Comments postId={post.id} />
            </section>
        </main>
    );
}
