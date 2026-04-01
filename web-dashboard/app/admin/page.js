'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, ExternalLink, Calendar, Search, LogOut, CheckCircle, Database, Users, Star, BrainCircuit, Activity, Settings, BarChart3, Bot, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ dealsToday: 0, blogsToday: 0 });

  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [sweepStats, setSweepStats] = useState({ checked: 0, rejected: 0 });

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals?status=pending');
      const data = await res.json();
      setDeals(data.deals || []); // Keep original structure for data.deals
    } catch (e) {
      console.error(e);
    } finally {
      // setLoading(false); // Moved to useEffect
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/today-stats');
      const data = await res.json();
      setStats(data || { dealsToday: 0, blogsToday: 0 });
    } catch(e) {}
  };

  const handleBulkSweep = async () => {
    if (!confirm('This will sequentially verify all pending Amazon deals on this page against their live prices. It may take a minute. Dead deals will be automatically rejected. Continue?')) return;
    
    setIsBulkVerifying(true);
    let checked = 0;
    let rejected = 0;
    
    for (const deal of deals) {
        if (!deal.url.includes('amazon') && !deal.url.includes('amzn.to')) continue;
        setSweepStats({ checked: checked + 1, rejected });
        checked++;
        
        try {
            const vRes = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: deal.url, expectedPrice: deal.discount_price })
            });
            const vData = await vRes.json();
            
            if (vData.success && !vData.priceMatch && vData.livePrice !== 'Unknown') {
                 // The deal is dead or severely changed price. Reject it instantly.
                 await fetch('/api/deals', {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ id: deal.id, status: 'rejected' })
                 });
                 rejected++;
                 setSweepStats({ checked, rejected });
            }
        } catch(e) {}
    }
    
    alert(`Sweeper Finished! Checked ${checked} links. Purged ${rejected} dead deals.`);
    setIsBulkVerifying(false);
    fetchDeals();
  };

  useEffect(() => {
    fetchDeals();
    fetchStats();
    setLoading(false); // Moved here from fetchDeals finally block
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
          <Link href="/admin/reels-queue" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#58A6FF] transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#58A6FF]/20 text-[#58A6FF]">
                          <Activity size={24} />
                      </div>
                      <h3 className="font-bold text-lg text-white">Medical Reels Queue</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Review & manage the AI's upcoming scheduled Facebook Videos.</p>
              </div>
          </Link>
      </div>

      {deals.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
             <h2>No deals waiting for review.</h2>
             <p>Use the Manual Hunt box above, or wait for the Intake cron to grab more.</p>
        </div>
      ) : (
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#ccc' }}>Pending Queue ({deals.length})</h2>
            <button 
                onClick={handleBulkSweep} 
                disabled={isBulkVerifying}
                style={{ background: isBulkVerifying ? '#555' : 'linear-gradient(45deg, #00D084, #00A669)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: isBulkVerifying ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
                {isBulkVerifying ? `🧹 Sweeping... (${sweepStats.checked}/${deals.length}) [Purged: ${sweepStats.rejected}]` : '🧹 Auto-Sweep Dead Deals'}
            </button>
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
        
        <VerificationModule dealUrl={deal.url} originalImage={deal.image_url} originalPrice={deal.discount_price} />
        
        <div className="form-group" style={{marginTop: '15px'}}>
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

function VerificationModule({ dealUrl, originalImage, originalPrice }) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [liveData, setLiveData] = useState(null);

  const verifyDeal = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dealUrl, expectedPrice: originalPrice })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLiveData(data);
        setStatus('success');
      } else {
        alert(data.error || 'Failed to verify');
        setStatus('error');
      }
    } catch(e) {
      alert('Verification network error');
      setStatus('error');
    }
  };

  if (status === 'success' && liveData) {
    return (
        <div style={{ background: 'rgba(0, 255, 0, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0, 255, 0, 0.3)', marginBottom: '15px', color: '#ccc', fontSize: '0.85rem' }}>
          <div style={{color: '#00D084', fontWeight: 'bold', marginBottom: '5px'}}>✅ Verified Amazon Integrity</div>
          <div><strong style={{color: 'white'}}>Live Price: </strong> ${liveData.livePrice} {liveData.priceMatch ? '✅' : '❌ (Mismatch)'}</div>
          <div style={{ marginTop: '5px' }}><strong style={{color: 'white'}}>Live Image: </strong> {liveData.liveImage !== 'Not Found' ? <a href={liveData.liveImage} target="_blank" style={{color: '#58A6FF'}}>Extracted Target Image ↗</a> : '❌ Check Page'}</div>
        </div>
    );
  }

  return (
      <button 
        onClick={verifyDeal}
        disabled={status === 'loading'}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '15px' }}
      >
        <Search size={16} /> 
        {status === 'loading' ? 'Checking Live Amazon Link...' : 'Verify Deal Integrity (Price/Image)'}
      </button>
  );
}
