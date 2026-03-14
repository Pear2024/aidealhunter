'use client';
import { useEffect, useState } from 'react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

export default function Storefront() {
  const { isSignedIn } = useUser();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch('/api/deals?status=approved');
        const data = await res.json();
        // Decorate default user context into the deal cards if needed, or sort by votes
        const sortedDeals = (data.deals || []).sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0));
        setDeals(sortedDeals);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const handleVote = async (e, dealId) => {
    e.stopPropagation();
    if (!isSignedIn) {
      alert("Please sign in to vote! 💖");
      return;
    }

    // Optimistic UI updates could be added here, but doing straightforward refresh for simplicity.
    try {
      const res = await fetch('/api/deals/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, voteType: 1 }) // 1 is Upvote
      });
      const data = await res.json();
      
      if (res.ok) {
        setDeals(deals.map(d => d.id === dealId ? { ...d, vote_score: data.newScore } : d));
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Finding the best discounts for you...</p>
      </div>
    );
  }

  const getRetailerInfo = (url) => {
    if (!url) return { name: 'Unknown', color: '#666' };
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('amazon')) return { name: 'Amazon', color: '#FF9900' };
    if (lowerUrl.includes('walmart')) return { name: 'Walmart', color: '#0071CE' };
    if (lowerUrl.includes('target')) return { name: 'Target', color: '#CC0000' };
    if (lowerUrl.includes('costco')) return { name: 'Costco', color: '#005DAA' };
    if (lowerUrl.includes('bestbuy') || lowerUrl.includes('best buy')) return { name: 'Best Buy', color: '#0046BE' };
    return { name: 'Retailer', color: '#666' };
  };

  return (
    <main className="dashboard">
      <header className="header" style={{ marginBottom: '2rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Sign In / Join</button>
            </SignInButton>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <a href="/submit" style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', color: 'white', textDecoration: 'none', fontSize: '0.9rem' }}>+ Submit Deal</a>
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
        <h1 style={{ background: '-webkit-linear-gradient(45deg, #FF9A9E, #FECFEF)', WebkitBackgroundClip: 'text' }}>🎁 Inland Empire Smart Shopper</h1>
        <p className="subtitle">Hand-picked best deals in Southern California and beyond, updated daily!</p>
      </header>
      
      {deals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Hunting for new deals...</h2>
          <p>Check back soon for the latest massive discounts.</p>
        </div>
      ) : (
        <div className="deal-grid">
          {deals.map(deal => (
            <div key={deal.id} className="deal-card fade-in" style={{ cursor: 'pointer', background: 'rgba(255, 255, 255, 0.03)' }} onClick={() => window.open(deal.url, '_blank')}>
              <div className="card-image-wrapper" style={{ background: '#fff', padding: '20px' }}>
                 {deal.discount_price && deal.original_price && deal.original_price > deal.discount_price && (
                    <div className="confidence-badge" style={{ background: '#e53935', fontSize: '1rem', padding: '6px 12px' }}>
                      {Math.round((1 - deal.discount_price / deal.original_price) * 100)}% OFF
                    </div>
                 )}
                 {deal.image_url ? (
                  <img src={deal.image_url} alt="Deal" className="deal-image"/>
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </div>
              <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0, lineHeight: '1.4', fontWeight: 'bold' }}>{deal.title}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                   {(() => {
                     const { name, color } = getRetailerInfo(deal.url);
                     return (
                       <span style={{ background: color, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                         {name}
                       </span>
                     );
                   })()}
                   {deal.brand && <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>By {deal.brand}</span>}
                </div>
                
                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    {deal.discount_price && <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>${parseFloat(deal.discount_price).toFixed(2)}</span>}
                    {deal.original_price && <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginLeft: '10px' }}>${parseFloat(deal.original_price).toFixed(2)}</span>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                      onClick={(e) => handleVote(e, deal.id)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'var(--success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                    >
                      🔥 {deal.vote_score || 0}
                    </button>
                    <button className="btn btn-approve" style={{ padding: '0.6rem 1.2rem', flex: 'none', background: 'linear-gradient(90deg, #ff8a00, #e52e71)' }} onClick={(e) => { e.stopPropagation(); window.open(deal.url, '_blank'); }}>Buy Now 🛒</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
