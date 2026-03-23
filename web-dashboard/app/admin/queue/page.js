'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function QueueBoard() {
  const [data, setData] = useState({ pending: [], queued: [], published: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/queue')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const calculateETA = (index) => {
      // Adjusted to sync with the official GitHub Actions 1-Hour schedule
      if (index === 0) return 'Next Cron Run (Within 1 Hr)';
      return `In ~${index * 1} Hours`;
  };

  return (
    <main style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '40px 20px', fontFamily: 'var(--font-geist-sans)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#ffcc80', fontWeight: 'bold' }}>📋 AI Content Queue Board</h1>
                    <p style={{ color: '#aaa', fontSize: '1.1rem' }}>Track the lifecycle of deals from Discovery to AI Copywriting.</p>
                </div>
                <Link href="/admin" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', textDecoration: 'none', color: '#fff', fontWeight: 'bold' }}>
                    ← Back to Dashboard
                </Link>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: '#666' }}>Loading board data...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', alignItems: 'start' }}>
                    
                    {/* Column 1: Awaiting Validation */}
                    <div style={{ background: '#111', borderRadius: '16px', border: '1px solid #333', padding: '20px', minHeight: '600px' }}>
                        <div style={{ paddingBottom: '15px', borderBottom: '1px solid #333', marginBottom: '15px' }}>
                            <h2 style={{ fontSize: '1.2rem', color: '#ff3b30', display: 'flex', justifyContent: 'space-between' }}>
                                <span>1. Trending Product Pool 🔥</span>
                                <span style={{ background: '#331111', padding: '2px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>{data.pending.length}</span>
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Stockpiled by AI Discovery. Writer randomly selects from here.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {data.pending.length === 0 && <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No items in queue.</p>}
                            {data.pending.map((item, i) => (
                                <div key={i} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '15px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>{item.brand || 'No Brand'} • {item.category}</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', lineHeight: '1.4' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '8px' }}>Added: {new Date(item.created_at).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Queued for Copywriter */}
                    <div style={{ background: '#111', borderRadius: '16px', border: '1px solid #333', padding: '20px', minHeight: '600px' }}>
                        <div style={{ paddingBottom: '15px', borderBottom: '1px solid #333', marginBottom: '15px' }}>
                            <h2 style={{ fontSize: '1.2rem', color: '#ffcc80', display: 'flex', justifyContent: 'space-between' }}>
                                <span>2. Queued for AI Writer ⏱️</span>
                                <span style={{ background: '#332200', padding: '2px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>{data.queued.length}</span>
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Approved deals. Waiting for the AI Copywriter Cron job.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {data.queued.length === 0 && <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No items in queue.</p>}
                            {data.queued.map((item, i) => (
                                <div key={i} style={{ background: '#1a1a1a', border: '1px solid #ffcc8044', padding: '15px', borderRadius: '10px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#ffcc80', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        {calculateETA(i)}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px', marginTop: '5px' }}>{item.brand || 'No Brand'} • {item.category}</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', lineHeight: '1.4', color: '#fff' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#00D084', marginTop: '8px', fontWeight: 'bold' }}>Position: #{i + 1} in queue</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 3: Published */}
                    <div style={{ background: '#111', borderRadius: '16px', border: '1px solid #333', padding: '20px', minHeight: '600px' }}>
                        <div style={{ paddingBottom: '15px', borderBottom: '1px solid #333', marginBottom: '15px' }}>
                            <h2 style={{ fontSize: '1.2rem', color: '#00D084', display: 'flex', justifyContent: 'space-between' }}>
                                <span>3. Published (On-Air) 📡</span>
                                <span style={{ background: '#003322', padding: '2px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>{data.published.length}</span>
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Recently posted blogs via AI.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {data.published.length === 0 && <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No items in queue.</p>}
                            {data.published.map((item, i) => (
                                <div key={i} style={{ background: '#1a1a1a', border: '1px solid #00D08444', padding: '15px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#00D084', marginBottom: '5px', fontWeight: 'bold' }}>Blog: {item.blog_title}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#888', lineHeight: '1.4' }}>Deal: {item.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '8px' }}>On-Air: {new Date(item.published_at).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    </main>
  );
}
