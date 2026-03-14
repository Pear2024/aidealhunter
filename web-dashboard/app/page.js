'use client';
import { useEffect, useState } from 'react';

export default function Storefront() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch('/api/deals?status=approved');
        const data = await res.json();
        setDeals(data.deals || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Finding the best discounts for you...</p>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '3.5rem', background: '-webkit-linear-gradient(45deg, #FF9A9E, #FECFEF)', WebkitBackgroundClip: 'text' }}>🎁 Inland Empire Smart Shopper</h1>
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
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.1rem', lineHeight: '1.4', fontWeight: 'bold' }}>{deal.title}</h3>
                {deal.brand && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>By {deal.brand}</p>}
                
                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    {deal.discount_price && <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>${parseFloat(deal.discount_price).toFixed(2)}</span>}
                    {deal.original_price && <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginLeft: '10px' }}>${parseFloat(deal.original_price).toFixed(2)}</span>}
                  </div>
                  <button className="btn btn-approve" style={{ padding: '0.6rem 1.2rem', flex: 'none', background: 'linear-gradient(90deg, #ff8a00, #e52e71)' }} onClick={(e) => { e.stopPropagation(); window.open(deal.url, '_blank'); }}>Buy Now 🛒</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
