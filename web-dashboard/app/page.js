'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      setDeals(data.deals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
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
        <p className="subtitle">Admin Review Dashboard</p>
      </header>

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
