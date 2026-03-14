'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchProfileData();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const fetchProfileData = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (res.ok) {
        setProfileData(data);
      }
    } catch (error) {
      console.error('Failed to load profile data', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading Profile...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 20px', textAlign: 'center' }}>
        <h2>Sign in required 🔒</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>You must be logged in to view your profile.</p>
        <Link href="/" className="btn btn-approve" style={{ display: 'inline-block', marginTop: '20px' }}>Go Home</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img 
            src={user?.imageUrl || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
            alt="Profile Avatar" 
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
          />
          <div>
            <h1 style={{ margin: 0 }}>{user?.firstName || user?.username || 'Deal Hunter'}</h1>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px 30px', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Reputation</p>
            <h2 style={{ margin: '5px 0 0 0', fontSize: '2rem', color: 'var(--accent)' }}>🔥 {profileData?.totalReputation || 0}</h2>
        </div>
      </header>

      <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span> Your Hunter Stats
          </h2>
          <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
             <div style={{ textAlign: 'center', padding: '15px' }}>
                 <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Submitted</p>
                 <h3 style={{ margin: '10px 0 0 0', fontSize: '1.8rem' }}>{profileData?.deals?.length || 0}</h3>
             </div>
             <div style={{ textAlign: 'center', padding: '15px', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                 <p style={{ margin: 0, color: 'var(--success)' }}>Approved Live</p>
                 <h3 style={{ margin: '10px 0 0 0', fontSize: '1.8rem' }}>{profileData?.stats?.approved_count || 0}</h3>
             </div>
             <div style={{ textAlign: 'center', padding: '15px' }}>
                 <p style={{ margin: 0, color: '#f5a623' }}>Pending Review</p>
                 <h3 style={{ margin: '10px 0 0 0', fontSize: '1.8rem' }}>{profileData?.stats?.pending_count || 0}</h3>
             </div>
          </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🛍️</span> Deal Submissions</span>
          <Link href="/submit" className="btn btn-approve" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>+ Submit New</Link>
        </h2>
        
        {(!profileData?.deals || profileData.deals.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>You haven't submitted any deals yet.</p>
             <p style={{ color: 'var(--text-secondary)' }}>Find a great discount and share it with the community to start earning reputation!</p>
          </div>
        ) : (
          <div className="deals-grid">
            {profileData.deals.map((deal) => (
              <div key={deal.id} className="deal-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', background: '#fff', borderRadius: '16px 16px 0 0', height: '200px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {deal.status === 'pending' && <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#f5a623', color: '#000', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2 }}>⏳ Pending Approval</span>}
                  {deal.status === 'rejected' && <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--danger)', color: '#fff', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2 }}>❌ Rejected</span>}
                  {deal.status === 'approved' && <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--success)', color: '#fff', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2 }}>✅ Live on Store</span>}

                  {deal.discount_percentage && (
                    <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--danger)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 2 }}>
                      {deal.discount_percentage}% OFF
                    </span>
                  )}
                  {deal.image_url ? (
                    <img src={deal.image_url} alt={deal.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#ccc', fontSize: '0.9rem' }}>No Image</span>
                  )}
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {deal.title}
                  </h3>
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                      <div>
                        {deal.discount_price && <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>${parseFloat(deal.discount_price).toFixed(2)}</span>}
                        {deal.original_price && <span style={{ fontSize: '0.9rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginLeft: '8px' }}>${parseFloat(deal.original_price).toFixed(2)}</span>}
                      </div>
                      <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                         🔥 {deal.vote_score || 0}
                      </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
