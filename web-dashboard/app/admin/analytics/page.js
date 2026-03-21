'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpdateRevenue = async (id, currentRev) => {
    const newRev = prompt('Enter new revenue amount ($) for this deal:', currentRev);
    if (newRev === null) return;
    
    const parsedRev = parseFloat(newRev);
    if (isNaN(parsedRev)) {
      alert('Invalid number');
      return;
    }

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, revenue: parsedRev })
      });
      fetchStats(); // Refresh data
    } catch (e) {
      console.error('Failed to update revenue');
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Crunching the numbers...</p>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <header className="header" style={{ marginBottom: '40px' }}>
        <h1>📈 Performance Analytics</h1>
        <p className="subtitle">Track Clicks & Revenue for your Approved Deals</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px' }}>
          <Link href="/admin" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to Review Deals</Link>
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Go to Storefront ↗</Link>
        </div>
      </header>

      <div className="stats-overview" style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', marginBottom: '40px', maxWidth: '1000px', margin: '0 auto 40px auto' 
      }}>
        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Total Approved Posts</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-light)', marginTop: '10px' }}>{stats?.totalApproved || 0}</p>
        </div>
        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Total Link Clicks</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent)', marginTop: '10px' }}>{stats?.totalClicks || 0}</p>
        </div>
        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Total Revenue Earned</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '10px' }}>
            ${parseFloat(stats?.totalRevenue || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="top-deals-section" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', color: 'var(--text-light)' }}>🔥 Top 10 Deals (By Clicks)</h2>
        
        {stats?.topDeals && stats.topDeals.length > 0 ? (
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '15px' }}>Deal Title</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Brand</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Clicks</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Revenue / Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.topDeals.map((deal, idx) => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{deal.title}</div>
                      <a href={deal.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none' }}>View Source ↗</a>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)' }}>{deal.brand}</td>
                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent)' }}>{deal.clicks}</td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '1.1rem', marginBottom: '8px' }}>
                        ${parseFloat(deal.earned_revenue).toFixed(2)}
                      </div>
                      <button 
                        onClick={() => handleUpdateRevenue(deal.id, deal.earned_revenue)}
                        style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-light)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✏️ Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No approved deals yet. Start approving deals to see stats!</p>
          </div>
        )}
      </div>
    </main>
  );
}
