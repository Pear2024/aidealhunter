'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function QueueBoard() {
  const [data, setData] = useState({ pending: [], queued: [], published: [] });
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false); // State for the QA agent button

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/queue');
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  const handleManualApprove = async (id, currentStatus) => {
    // ... code truncated for brevity, standard handle block ...
    try {
      const res = await fetch('/api/admin/deals/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' })
      });
      if(res.ok) fetchQueues();
    } catch(e) {}
  };

  const dispatchQAAgent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cron/agent-qa?key=super_secret_ai_cron_password_123');
      const data = await res.json();
      alert('QA Agent Report:\n' + data.agent_report);
      fetchQueues();
    } catch(e) {
      alert('Error triggering QA Agent');
    }
    setIsLoading(false);
  };

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
                        <div style={{ paddingBottom: '15px', borderBottom: '1px solid #333', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>1. Trending Product Pool 🔥</span>
                                    <span style={{ background: '#331111', padding: '2px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>{data.pending.length}</span>
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Stockpiled by AI Discovery. Writer randomly selects from here.</p>
                            </div>
                            <button onClick={dispatchQAAgent} disabled={isLoading} style={{
                                fontSize: '0.75rem',
                                background: isLoading ? 'rgba(255,204,128,0.1)' : 'rgba(255,204,128,0.2)',
                                color: '#ffcc80',
                                padding: '6px 12px',
                                borderRadius: '9999px',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 'bold',
                                border: '1px solid rgba(255,204,128,0.3)',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}>
                                <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                {isLoading ? 'Scanning...' : 'Auto-Approve AI'}
                            </button>
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
                                    
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                         <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', background: item.fb_status === 'published' ? 'rgba(0,208,132,0.1)' : item.fb_status === 'processing' ? 'rgba(255,204,128,0.1)' : item.fb_status === 'failed' ? 'rgba(255,59,48,0.1)' : 'rgba(255,255,255,0.05)', color: item.fb_status === 'published' ? '#00D084' : item.fb_status === 'processing' ? '#ffcc80' : item.fb_status === 'failed' ? '#ff3b30' : '#666', border: `1px solid ${item.fb_status === 'published' ? '#00D08455' : item.fb_status === 'processing' ? '#ffcc8055' : item.fb_status === 'failed' ? '#ff3b3055' : '#444'}` }}>
                                              {item.fb_status === 'published' ? '✅ FB Posted' : item.fb_status === 'processing' ? '⚙️ FB Processing' : item.fb_status === 'failed' ? '❌ FB Failed' : '⏳ Wait FB'}
                                         </div>
                                         <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', background: item.blog_status === 'published' ? 'rgba(0,208,132,0.1)' : item.blog_status === 'processing' ? 'rgba(255,204,128,0.1)' : item.blog_status === 'failed' ? 'rgba(255,59,48,0.1)' : 'rgba(255,255,255,0.05)', color: item.blog_status === 'published' ? '#00D084' : item.blog_status === 'processing' ? '#ffcc80' : item.blog_status === 'failed' ? '#ff3b30' : '#666', border: `1px solid ${item.blog_status === 'published' ? '#00D08455' : item.blog_status === 'processing' ? '#ffcc8055' : item.blog_status === 'failed' ? '#ff3b3055' : '#444'}` }}>
                                              {item.blog_status === 'published' ? '✅ Blog Done' : item.blog_status === 'processing' ? '⚙️ Blog Processing' : item.blog_status === 'failed' ? '❌ Blog Failed' : '⏳ Wait Blog'}
                                         </div>
                                    </div>

                                    <div style={{ fontSize: '0.8rem', color: '#00D084', marginTop: '12px', fontWeight: 'bold' }}>Position: #{i + 1} in queue</div>
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
