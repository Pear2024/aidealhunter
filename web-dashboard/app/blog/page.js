import { getConnection } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BlogArchive({ searchParams }) {
    let connection;
    let posts = [];
    let totalPages = 1;
    
    // Support Next.js versions where searchParams might be a Promise or an Object
    const unwrappedParams = await searchParams;
    const page = parseInt(unwrappedParams?.page || '1', 10);
    const limit = 12;
    const offset = (page - 1) * limit;

    try {
        connection = await getConnection();
        
        // Fetch Total Count
        const [countRes] = await connection.execute('SELECT COUNT(*) as total FROM ai_blog_posts');
        const totalPosts = countRes[0].total;
        totalPages = Math.ceil(totalPosts / limit);

        // Fetch Paginated Results
        const [rows] = await connection.execute(`SELECT id, slug, title, image_url, created_at FROM ai_blog_posts ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
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
                            <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', backgroundColor: '#050505' }}>
                                <img src={post.image_url} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(15px)', opacity: 0.4, transform: 'scale(1.1)' }} />
                                <img 
                                    src={post.image_url} 
                                    alt={post.title} 
                                    style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, padding: '15px' }} 
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '4rem', gap: '15px' }}>
                    {/* First Page Button */}
                    {page > 1 ? (
                        <Link href={`/blog?page=1`} style={{ padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,51,102,0.1)', color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', border: '1px solid rgba(255,51,102,0.2)' }}>
                            &laquo; First
                        </Link>
                    ) : (
                        <div style={{ padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#555', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.05)', cursor: 'not-allowed' }}>
                            &laquo; First
                        </div>
                    )}

                    {/* Previous Page Button */}
                    {page > 1 ? (
                        <Link href={`/blog?page=${page - 1}`} style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,51,102,0.1)', color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', border: '1px solid rgba(255,51,102,0.2)' }}>
                            &larr; Prev
                        </Link>
                    ) : (
                        <div style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#555', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.05)', cursor: 'not-allowed' }}>
                            &larr; Prev
                        </div>
                    )}
                    
                    <span style={{ color: '#aaa', fontWeight: 'bold', margin: '0 10px' }}>Page {page} of {totalPages}</span>

                    {/* Next Page Button */}
                    {page < totalPages ? (
                        <Link href={`/blog?page=${page + 1}`} style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,51,102,0.1)', color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', border: '1px solid rgba(255,51,102,0.2)' }}>
                            Next &rarr;
                        </Link>
                    ) : (
                        <div style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#555', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.05)', cursor: 'not-allowed' }}>
                            Next &rarr;
                        </div>
                    )}

                    {/* Last Page Button */}
                    {page < totalPages ? (
                        <Link href={`/blog?page=${totalPages}`} style={{ padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,51,102,0.1)', color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', border: '1px solid rgba(255,51,102,0.2)' }}>
                            Last &raquo;
                        </Link>
                    ) : (
                        <div style={{ padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#555', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.05)', cursor: 'not-allowed' }}>
                            Last &raquo;
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
