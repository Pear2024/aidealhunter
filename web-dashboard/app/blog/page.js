import { getConnection } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BlogArchive() {
    let connection;
    let posts = [];
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT id, slug, title, image_url, created_at FROM ai_blog_posts ORDER BY created_at DESC');
        posts = rows;
    } catch(e) {
        console.error("Blog Fetch Error", e);
    } finally {
        if(connection) try { await connection.end() } catch(e){}
    }

    return (
        <main className="container fade-in">
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontWeight: '800', fontSize: '2.5rem', marginBottom: '1rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    The Insider Blog
                </h1>
                <p style={{ color: '#aaa', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                    Tips, tricks, and life hacks to maximize your savings. Designed exclusively for the Inland Empire.
                </p>
                <Link href="/" style={{ display: 'inline-block', marginTop: '15px', color: '#ff3366', textDecoration: 'none', fontWeight: 'bold' }}>
                    &larr; Back to Deals
                </Link>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                {posts.length === 0 ? (
                    <div style={{ textAlign: 'center', gridColumn: '1 / -1', color: '#888', padding: '3rem' }}>No articles published yet. Check back soon!</div>
                ) : posts.map(post => (
                    <Link href={`/blog/${post.slug}`} key={post.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="blog-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '100%', height: '220px', overflow: 'hidden' }}>
                                <img 
                                    src={post.image_url} 
                                    alt={post.title} 
                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${post.id * 88}/1200/630`; }}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            </div>
                            <div style={{ padding: '25px' }}>
                                <p style={{ fontSize: '0.8rem', color: '#ff3366', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px' }}>
                                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'white', lineHeight: '1.4' }}>{post.title}</h3>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
