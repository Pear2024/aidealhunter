import { getConnection } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Comments from './Comments'; 
import AdBanner from '@/app/components/AdBanner'; 

export const revalidate = 60; // Revalidate every 60s

export async function generateMetadata({ params }) {
    const { slug } = params;
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT title FROM ai_blog_posts WHERE slug = ?', [slug]);
        if (rows.length > 0) return { title: rows[0].title + " | IE Deal Hunter Blog" };
    } catch(e) {} finally { if (connection) try{ connection.end() }catch(e){} }
    return { title: "Blog Article" };
}

export default async function BlogPostPage({ params }) {
    const { slug } = params;
    let post = null;
    let connection;
    
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT * FROM ai_blog_posts WHERE slug = ?', [slug]);
        if (rows.length === 0) return notFound();
        post = rows[0];
    } catch(e) { console.error(e); } finally { if(connection) try{ await connection.end() }catch(e){} }

    if (!post) return notFound();

    return (
        <main className="container fade-in">
            <Link href="/blog" style={{ color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', marginBottom: '20px', display: 'inline-block' }}>&larr; Back to Blog</Link>
            
            <article style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '3rem' }}>
                <div style={{ width: '100%', height: '400px', backgroundImage: `url(${post.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
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
