'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

export default function Storefront() {
  const { isSignedIn } = useUser();
  const [latestDeals, setLatestDeals] = useState([]);
  const [recommendedDeals, setRecommendedDeals] = useState([]);
  const [latestBlogs, setLatestBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSegment, setUserSegment] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadDeals = async (pageNum, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const getCookie = (name) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return match[2];
        return null;
      };
      const preferredBrand = getCookie('preferred_brand');

      try {
        const res = await fetch(`/api/deals?status=all&category=${activeTab}&page=${pageNum}`);
        const data = await res.json();
        
        if (data.blogs) {
            setLatestBlogs(data.blogs);
        }
        
        const sortedDeals = (data.deals || []).sort((a, b) => (b.merchandiser_score || 0) - (a.merchandiser_score || 0));
        
        if (sortedDeals.length < 50) setHasMore(false);
        else setHasMore(true);

        if (!reset) {
            setLatestDeals(prev => {
                const existingIds = new Set(prev.map(d => d.id));
                const uniqueNew = sortedDeals.filter(d => !existingIds.has(d.id));
                return [...prev, ...uniqueNew];
            });
            return;
        }

        // --- PHASE 20: Taste Profiler Driven Sorting (Page 1 Only) ---
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
                  if (textToMatch.includes(word)) { isMatch = true; break; }
               }
               
               if (lowSeg.includes('clearance') || lowSeg.includes('budget') || lowSeg.includes('cheap')) {
                   const original = parseFloat(d.original_price);
                   const discounted = parseFloat(d.discount_price);
                   if (original && discounted && (1 - discounted / original) > 0.4) isMatch = true;
               }
               
               if (isMatch) recommendList.push(d);
               else otherList.push(d);
            }
            
            if (recommendList.length > 0) {
                setRecommendedDeals(recommendList);
                setLatestDeals(otherList);
            } else setLatestDeals(sortedDeals);
        } else if (preferredBrand) {
           const decodedBrand = decodeURIComponent(preferredBrand).toLowerCase();
           setRecommendedDeals(sortedDeals.filter(d => d.brand?.toLowerCase() === decodedBrand));
           setLatestDeals(sortedDeals.filter(d => d.brand?.toLowerCase() !== decodedBrand));
        } else {
           setLatestDeals(sortedDeals);
        }
      } catch (e) { console.error(e); } 
      finally {
        if (reset) setLoading(false);
        else setLoadingMore(false);
      }
    };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadDeals(1, true);
  }, [activeTab]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadDeals(nextPage, false);
  };


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
    <div key={deal.id} className="deal-card fade-in" style={{ cursor: isExpired ? 'not-allowed' : 'pointer', background: 'rgba(255, 255, 255, 0.03)', opacity: isExpired ? 0.6 : 1, filter: isExpired ? 'grayscale(80%)' : 'none' }} onClick={() => !isExpired && window.open('/r/' + deal.id, '_blank')}>
      <div className="card-image-wrapper">
         {isExpired && (
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                 <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem', border: '3px solid white', padding: '10px 20px', transform: 'rotate(-15deg)' }}>EXPIRED</span>
             </div>
         )}
         {deal.discount_price && deal.original_price && deal.original_price > deal.discount_price && !isExpired && (
            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
              <span className="premium-badge" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)' }}>{Math.round((1 - deal.discount_price / deal.original_price) * 100)}% OFF</span>
            </div>
         )}
         {deal.image_url ? (
          <img src={deal.image_url} alt="Deal" className="deal-image" referrerPolicy="no-referrer" />
        ) : (
          <div className="no-image">No Image</div>
        )}
      </div>
      <div className="card-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 10px 0', lineHeight: '1.5', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {deal.title.replace(/\[DEMO\]\s*/g, '')}
            </h3>
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
        
        <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                {deal.discount_price && <span className="discount-text" style={{ fontSize: '1.8rem', color: isExpired ? '#888' : 'inherit' }}>${parseFloat(deal.discount_price).toFixed(2)}</span>}
                {deal.original_price && <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginLeft: '10px' }}>${parseFloat(deal.original_price).toFixed(2)}</span>}
            </div>
            {deal.installment_plan && !isExpired && (
                <div style={{ fontSize: '0.8rem', color: '#00D084', marginTop: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    💳 {deal.installment_plan}
                </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="vote-btn"
              onClick={(e) => { if(!isExpired) handleVote(e, deal.id); }}
              disabled={isExpired}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px', color: isExpired ? '#888' : 'white', cursor: isExpired ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: 'bold', minWidth: '60px' }}
            >
              🔥 <span style={{fontSize:'0.95rem'}}>{deal.vote_score || 0}</span>
            </button>
            {isExpired ? (
                <button className="premium-buy-btn" disabled>Ended ⏳</button>
            ) : (
                <button className="premium-buy-btn" onClick={(e) => { e.stopPropagation(); window.open('/r/' + deal.id, '_blank'); }}>Get Deal 🛒</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )};

  return (
    <>
      <nav style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        background: 'rgba(5, 5, 5, 0.7)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--card-border)', padding: '15px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '800', fontSize: '1.4rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem' }}>💎</span> 
            <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DealHunter Pro</span>
          </div>
          
          <div style={{ display: 'none', '@media (minWidth: 768px)': { display: 'flex' }, gap: '24px', alignItems: 'center', margin: '0 2rem' }} className="desktop-nav">
              <Link href="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>🛍️ Shop Deals</Link>
              <Link href="/blog" style={{ color: '#aaa', textDecoration: 'none', fontWeight: 'bold', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#aaa'}>📝 AI Reviews & Guides</Link>
          </div>
          
          <div>
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <button className="btn-outline">Sign In</button>
              </SignInButton>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Link href="/submit" className="btn-outline" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>+ Submit Deal</Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="dashboard" style={{ paddingTop: '2rem' }}>
        <section style={{ 
          textAlign: 'center', marginBottom: '4rem', padding: '4rem 2rem', 
          background: 'radial-gradient(circle at 50% 0%, rgba(255, 51, 102, 0.15) 0%, transparent 70%)',
          borderRadius: '30px', position: 'relative', overflow: 'hidden'
        }} className="fade-in">
          <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '400px', height: '400px', background: 'var(--accent)', filter: 'blur(120px)', opacity: 0.15, borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', bottom: '-50%', right: '-10%', width: '300px', height: '300px', background: '#FF9933', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }}></div>
          
          <div style={{ display: 'inline-block', marginBottom: '1.5rem', border: '1px solid rgba(255,51,102,0.3)', padding: '6px 16px', borderRadius: '20px', background: 'rgba(255,51,102,0.1)', color: '#ff99a8', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '1px' }}>
             🚀 UP TO 90% OFF PREMIUM BRANDS 
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-1px', lineHeight: '1.2' }}>
            Discover Unbeatable <br/>
            <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Exclusive Deals</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Premium, hand-picked discounts powered by AI. Save big on top brands with our real-time deal engine.
          </p>
        </section>

      {/* PHASE 16: FTC Affiliate Disclosure Banner */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px 20px', textAlign: 'center', fontSize: '0.9rem', color: '#ccc', marginBottom: '2rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <strong>Affiliate Disclosure:</strong> As an Amazon Associate, I earn from qualifying purchases. We may earn a small commission if you buy through our links, at no extra cost to you.
      </div>
      
      {/* PHASE 32: Categorical Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '3rem', flexWrap: 'wrap' }} className="fade-in">
        {['all', 'digital', 'tech', 'food', 'household', 'travel'].map(tab => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab)}
             style={{
               background: activeTab === tab ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
               border: activeTab === tab ? 'none' : '1px solid rgba(255,255,255,0.1)',
               color: activeTab === tab ? 'white' : '#aaa',
               padding: '10px 24px',
               borderRadius: '30px',
               fontSize: '1rem',
               fontWeight: 'bold',
               cursor: 'pointer',
               textTransform: 'capitalize',
               transition: 'all 0.3s ease',
               boxShadow: activeTab === tab ? '0 4px 15px rgba(255,51,102,0.4)' : 'none'
             }}>
             {tab === 'all' ? 'All Deals' : tab}
           </button>
        ))}
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
          
          {latestBlogs.length > 0 && activeTab === 'all' && (
             <div style={{ marginBottom: '4rem', padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', margin: 0 }}>
                      <span style={{ fontSize: '1.8rem' }}>📝</span> Latest Buying Guides
                    </h2>
                    <Link href="/blog" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>View All Reviews →</Link>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                   {latestBlogs.map(blog => (
                      <Link href={`/blog/${blog.slug}`} key={blog.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="deal-card fade-in" style={{ cursor: 'pointer', background: 'rgba(255, 255, 255, 0.03)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                             <div style={{ height: '160px', overflow: 'hidden', borderRadius: '12px 12px 0 0', position: 'relative' }}>
                                 {blog.image_url ? (
                                    <img src={blog.image_url} alt={blog.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} onMouseOver={e => e.target.style.transform='scale(1.05)'} onMouseOut={e => e.target.style.transform='scale(1)'} referrerPolicy="no-referrer" />
                                 ) : (
                                    <div style={{ width: '100%', height: '100%', background: '#2d3748', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>No Image</div>
                                 )}
                             </div>
                             <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                 <h3 style={{ fontSize: '1.1rem', margin: '0 0 10px 0', lineHeight: '1.4', fontWeight: 'bold' }}>{blog.title}</h3>
                                 <div style={{ marginTop: 'auto', color: '#9ca3af', fontSize: '0.8rem' }}>
                                     {new Date(blog.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                                 </div>
                             </div>
                          </div>
                      </Link>
                   ))}
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
          
          {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '2rem' }}>
                  <button 
                      onClick={handleLoadMore} 
                      disabled={loadingMore}
                      className="btn-outline" 
                      style={{ padding: '12px 30px', fontSize: '1.1rem', background: loadingMore ? 'rgba(255,255,255,0.05)' : 'transparent', cursor: loadingMore ? 'wait' : 'pointer' }}
                  >
                      {loadingMore ? 'Loading hidden gems... 💎' : 'Load More Deals 👇'}
                  </button>
              </div>
          )}
        </>
      )}

      {/* PHASE 16: Amazon Price Disclaimer Footer */}
      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', color: '#888', fontSize: '0.85rem', lineHeight: '1.5' }}>
        <p>Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on the merchant&apos;s site (e.g., Amazon) at the time of purchase will apply to the purchase of this product.</p>
        <p style={{ marginTop: '10px' }}>&copy; {new Date().getFullYear()} DealHunter Pro. All rights reserved.</p>
      </footer>
    </main>
    </>
  );
}
