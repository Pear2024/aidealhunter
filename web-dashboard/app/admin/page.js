'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, ExternalLink, Calendar, Search, LogOut, CheckCircle, Database, Users, Star, BrainCircuit, Activity, Settings, BarChart3, Bot, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ dealsToday: 0, blogsToday: 0 });

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals?status=pending');
      const data = await res.json();
      setDeals(data.deals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/today-stats');
      const data = await res.json();
      setStats(data || { dealsToday: 0, blogsToday: 0 });
    } catch(e) {}
  };

  useEffect(() => {
    fetchDeals();
    fetchStats();
  }, []);

  const handleAction = async (id, action, currentData) => {
    setDeals(deals.filter(d => d.id !== id)); // Optimistic UI update
    
    try {
      await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action,
          data: currentData
        }),
      });
    } catch (e) {
      console.error(e);
      fetchDeals(); // Revert on failure
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Hunting for deals...</p>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <header className="header">
        <h1>🎯 AI Deal Hunter</h1>
        <p className="subtitle">Admin Review Dashboard (Secret URL)</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px' }}>
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Go back to Public Storefront</Link>
          <Link href="/admin/analytics" style={{ color: 'var(--success)', textDecoration: 'none' }}>View Analytics 📈</Link>
          <Link href="/admin/agents" style={{ color: '#ff9a9e', textDecoration: 'none', fontWeight: 'bold' }}>AI Overlord 🌌 →</Link>
        </div>
      </header>

      <SearchModule onSearchComplete={fetchDeals} />

      <h2 className="text-xl font-bold mb-4 text-white">Daily Outbound Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FF3366]/20 to-[#FF9933]/10 border border-[#FF3366]/30 shadow-lg">
              <h3 className="text-[#FF3366] font-bold text-sm uppercase tracking-wider mb-2">⚡ Facebook Short Posts</h3>
              <div className="text-5xl font-extrabold text-white">{stats.dealsToday} <span className="text-lg text-gray-400 font-normal">posts blasted</span></div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#00D084]/20 to-[#00A669]/10 border border-[#00D084]/30 shadow-lg">
              <h3 className="text-[#00D084] font-bold text-sm uppercase tracking-wider mb-2">✍️ Deep-Dive Blogs</h3>
              <div className="text-5xl font-extrabold text-white">{stats.blogsToday} <span className="text-lg text-gray-400 font-normal">articles published</span></div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#58A6FF]/20 to-[#3182CE]/10 border border-[#58A6FF]/30 shadow-lg">
              <h3 className="text-[#58A6FF] font-bold text-sm uppercase tracking-wider mb-2">🤖 Total Auto Operations</h3>
              <div className="text-5xl font-extrabold text-white">{stats.dealsToday + stats.blogsToday} <span className="text-lg text-gray-400 font-normal">tasks completed</span></div>
          </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold mb-4 text-white">Administration Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/admin/sponsor" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#00D084] transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#00D084]/20 text-[#00D084]">
                          <DollarSign size={24} />
                      </div>
                      <h3 className="font-bold text-lg text-white">High-Ticket / Sponsor</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Force-inject Impact CPA links and auto-generate SEO blogs.</p>
              </div>
          </Link>
          <Link href="/admin/queue" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#ffcc80] transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#ffcc80]/20 text-[#ffcc80]">
                          <Database size={24} />
                      </div>
                      <h3 className="font-bold text-lg text-white">Publishing Queue</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Track discovering deals and AI copywriter on-air scheduling.</p>
              </div>
          </Link>
      </div>

      {deals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h2>All Caught Up!</h2>
          <p>No pending deals left to review. Great job.</p>
        </div>
      ) : (
        <div className="stats-bar">
          <span className="badge">{deals.length} Pending Review</span>
        </div>
      )}

      <div className="deal-grid">
        {deals.map(deal => (
          <DealCard key={deal.id} deal={deal} onAction={handleAction} />
        ))}
      </div>
    </main>
  );
}

function DealCard({ deal, onAction }) {
  const [title, setTitle] = useState(deal.title || '');
  const [brand, setBrand] = useState(deal.brand || '');
  const [origPrice, setOrigPrice] = useState(deal.original_price || '');
  const [discPrice, setDiscPrice] = useState(deal.discount_price || '');

  return (
    <div className="deal-card fade-in">
      <div className="card-image-wrapper">
        <div className="confidence-badge">Score: {deal.confidence_score}</div>
        {deal.image_url ? (
          <img src={deal.image_url} alt="Deal" className="deal-image"/>
        ) : (
          <div className="no-image">No Image Found</div>
        )}
      </div>
      
      <div className="card-content">
        <a href={deal.url} target="_blank" rel="noopener noreferrer" className="original-link">View Original Source ↗</a>
        
        <div className="form-group">
          <label>Product Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        
        <div className="form-group">
          <label>Brand</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>

        <div className="price-row">
          <div className="form-group">
            <label>Original Price ($)</label>
            <input type="number" step="0.01" value={origPrice} onChange={(e) => setOrigPrice(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Discount Price ($)</label>
            <input type="number" step="0.01" value={discPrice} onChange={(e) => setDiscPrice(e.target.value)} />
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="btn btn-reject" 
            onClick={() => onAction(deal.id, 'reject')}
          >
            ❌ Reject
          </button>
          <button 
            className="btn btn-approve"
            onClick={() => onAction(deal.id, 'approve', { title, brand, original_price: origPrice, discount_price: discPrice })}
          >
            ✅ Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchModule({ onSearchComplete }) {
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/deals/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      });
      const data = await res.json();
      if (data.added > 0) {
        alert(`Success! Found and added ${data.added} new deals for "${keyword}".\\nThey are now available below for your review.`);
        onSearchComplete(); 
      } else {
        alert(data.message || 'No new deals found or they might be duplicates/rate-limited.');
      }
    } catch (e) {
      console.error(e);
      alert('Error searching for deals. Check console.');
    } finally {
      setIsSearching(false);
      setKeyword('');
    }
  };

  return (
    <div className="search-module slide-down fade-in" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', maxWidth: '600px', margin: '0 auto 30px auto', display: 'flex', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <input 
        type="text" 
        placeholder="Enter product (e.g. iPad, Sony, Laptop)..." 
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        disabled={isSearching}
        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
      />
      <button 
        onClick={handleSearch} 
        disabled={isSearching}
        style={{ padding: '0 25px', background: isSearching ? '#555' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSearching ? 'not-allowed' : 'pointer', transition: 'background 0.2s', fontSize: '1rem' }}
      >
        {isSearching ? '🤖 Hunting...' : '🤖 Hunt Deals!'}
      </button>
    </div>
  );
}
