'use client';
import { useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';

export default function SubmitDeal() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [formData, setFormData] = useState({ title: '', brand: '', original_price: '', discount_price: '', url: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const payload = { ...formData, user: { id: user.id, email: user.primaryEmailAddress?.emailAddress, username: user.username || user.firstName } };
      const res = await fetch('/api/deals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage('🎉 Deal successfully submitted to the community hub!');
        setFormData({ title: '', brand: '', original_price: '', discount_price: '', url: '' });
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to submit deal. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  if (!isLoaded) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>Loading profile...</div>;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '50px 20px', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--card-bg)', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>📤 Submit a Deal</h1>
          <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to Community Board</a>
        </div>

        {!isSignedIn ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '20px' }}>Join the community to post deals!</h3>
            <SignInButton mode="modal">
              <button style={{ padding: '12px 24px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>Sign In to Submit</button>
            </SignInButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Product Title *</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="e.g., Apple iPad Pro 11-inch (M4)" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Product URL *</label>
              <input type="url" name="url" required value={formData.url} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="https://amazon.com/dp/..." />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Paste the direct link. Our system handles affiliate conversion automatically.</p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Brand</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="Apple" />
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Original Price ($)</label>
                <input type="number" step="0.01" name="original_price" value={formData.original_price} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="999.00" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--success)', fontWeight: 'bold' }}>Deal Price ($) *</label>
                <input type="number" step="0.01" name="discount_price" required value={formData.discount_price} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--success)', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="799.00" />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: '10px', padding: '15px', background: loading ? '#555' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Submitting...' : '🚀 Submit Deal'}
            </button>

            {message && <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 'bold', color: message.includes('❌') ? 'var(--alert)' : 'var(--success)' }}>{message}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
