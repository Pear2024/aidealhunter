'use client';
import { useEffect, useState } from 'react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

export default function Storefront() {
  const { isSignedIn } = useUser();
  const [latestDeals, setLatestDeals] = useState([]);
  const [recommendedDeals, setRecommendedDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSegment, setUserSegment] = useState(null);

  useEffect(() => {
    // 1. Read tracking cookie for Personalization
    const getCookie = (name) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      if (match) return match[2];
      return null;
    };
    const preferredBrand = getCookie('preferred_brand');

    const fetchDeals = async () => {
      try {
        const res = await fetch('/api/deals?status=all');
        const data = await res.json();
        const sortedDeals = (data.deals || []).sort((a, b) => (b.merchandiser_score || 0) - (a.merchandiser_score || 0));
        
        // --- PHASE 20: Taste Profiler Driven Sorting ---
        const seg = data.visitorSegment;
        
        if (seg) {
            setUserSegment(seg);
            const lowSeg = seg.toLowerCase();
            const recommendList = [];
            const otherList = [];
            
            for (const d of sortedDeals) {
               const textToMatch = `${d.title} ${d.brand} ${d.url}`.toLowerCase();
               const segWords = lowSeg.split(' ').filter(w => w.length > 3 && !['under', 'lovers', 'moms', 'hunters', 'fans'].includes(w));
               
               let isMatch = false;
               for (const word of segWords) {
                  if (textToMatch.includes(word)) {
                     isMatch = true; break;
                  }
               }
               
               // Quick heuristic for bargain hunters
               if (lowSeg.includes('clearance') || lowSeg.includes('budget') || lowSeg.includes('cheap')) {
                   const original = parseFloat(d.original_price);
                   const discounted = parseFloat(d.discount_price);
                   if (original && discounted && (1 - discounted / original) > 0.4) {
                       isMatch = true;
                   }
               }
               
               if (isMatch) recommendList.push(d);
               else otherList.push(d);
            }
            
            if (recommendList.length > 0) {
                setRecommendedDeals(recommendList);
                setLatestDeals(otherList);
            } else {
                setLatestDeals(sortedDeals);
            }
        } else if (preferredBrand) {
           // Fallback to old phase personalization
           const decodedBrand = decodeURIComponent(preferredBrand).toLowerCase();
           setRecommendedDeals(sortedDeals.filter(d => d.brand?.toLowerCase() === decodedBrand));
           setLatestDeals(sortedDeals.filter(d => d.brand?.toLowerCase() !== decodedBrand));
        } else {
           setLatestDeals(sortedDeals);
        }

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
        setRecommendedDeals(recommendedDeals.map(d => d.id === dealId ? { ...d, vote_score: data.newScore } : d));
        setLatestDeals(latestDeals.map(d => d.id === dealId ? { ...d, vote_score: data.newScore } : d));
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

  const renderDeal = (deal) => {
    const isExpired = deal.status === 'expired';
    return (
    <div key={deal.id} className="deal-card fade-in" style={{ cursor: isExpired ? 'not-allowed' : 'pointer', background: 'rgba(255, 255, 255, 0.03)', opacity: isExpired ? 0.6 : 1, filter: isExpired ? 'grayscale(80%)' : 'none' }} onClick={() => !isExpired && window.open(deal.url, '_blank')}>
      <div className="card-image-wrapper" style={{ background: '#fff', padding: '20px', position: 'relative' }}>
         {isExpired && (
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                 <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem', border: '3px solid white', padding: '10px 20px', transform: 'rotate(-15deg)' }}>EXPIRED</span>
             </div>
         )}
         {deal.discount_price && deal.original_price && deal.original_price > deal.discount_price && !isExpired && (
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
            {deal.discount_price && <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: isExpired ? '#888' : 'var(--success)' }}>${parseFloat(deal.discount_price).toFixed(2)}</span>}
            {deal.original_price && <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginLeft: '10px' }}>${parseFloat(deal.original_price).toFixed(2)}</span>}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={(e) => { if(!isExpired) handleVote(e, deal.id); }}
              disabled={isExpired}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: isExpired ? '#888' : 'var(--success)', cursor: isExpired ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
            >
              🔥 {deal.vote_score || 0}
            </button>
            {isExpired ? (
                <button className="btn btn-approve" disabled style={{ padding: '0.6rem 1.2rem', flex: 'none', background: '#555', cursor: 'not-allowed' }}>Ended ⏳</button>
            ) : (
                <button className="btn btn-approve" style={{ padding: '0.6rem 1.2rem', flex: 'none', background: 'linear-gradient(90deg, #ff8a00, #e52e71)' }} onClick={(e) => { e.stopPropagation(); window.open(deal.url, '_blank'); }}>Buy Now 🛒</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )};

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

      {/* PHASE 16: FTC Affiliate Disclosure Banner */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px 20px', textAlign: 'center', fontSize: '0.9rem', color: '#ccc', marginBottom: '2rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <strong>Affiliate Disclosure:</strong> As an Amazon Associate, I earn from qualifying purchases. We may earn a small commission if you buy through our links, at no extra cost to you.
      </div>
      
      {(latestDeals.length === 0 && recommendedDeals.length === 0) ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Hunting for new deals...</h2>
          <p>Check back soon for the latest massive discounts.</p>
        </div>
      ) : (
        <>
          {recommendedDeals.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ color: '#ff8a00', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>🎯</span> Recommended For You
                {userSegment && <span style={{ fontSize: '0.9rem', color: '#ffcc80', border: '1px solid #ffcc80', padding: '2px 8px', borderRadius: '12px', marginLeft: 'auto' }}>{userSegment}</span>}
              </h2>
              <div className="deal-grid">
                {recommendedDeals.map(deal => renderDeal(deal))}
              </div>
            </div>
          )}
          
          <div>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                <span style={{ fontSize: '1.8rem' }}>⚡</span> Latest Deals
              </h2>
              <div className="deal-grid">
                {latestDeals.map(deal => renderDeal(deal))}
              </div>
          </div>
        </>
      )}

      {/* PHASE 16: Amazon Price Disclaimer Footer */}
      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', color: '#888', fontSize: '0.85rem', lineHeight: '1.5' }}>
        <p>Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on the merchant's site (e.g., Amazon) at the time of purchase will apply to the purchase of this product.</p>
        <p style={{ marginTop: '10px' }}>&copy; {new Date().getFullYear()} Inland Empire Smart Shopper. All rights reserved.</p>
      </footer>
    </main>
  );
}
