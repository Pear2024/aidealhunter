'use client';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function SponsorInjector() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [formData, setFormData] = useState({ 
      title: '', brand: '', price: '', 
      affiliateUrl: '', imageUrl: '', category: 'food',
      context: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/admin/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Sponsorship Successfully Injected & Blog Generated!');
        setFormData({ title: '', brand: '', price: '', affiliateUrl: '', imageUrl: '', category: 'food', context: '' });
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to inject deal. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  if (!isLoaded || !isSignedIn) return <main style={{ padding: '50px', background: '#050505', color: '#fff', textAlign: 'center' }}><h2>Access Denied</h2><p>You must be an administrator to view this page.</p></main>;

  return (
    <main style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '50px 20px', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#111', padding: '40px', borderRadius: '16px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: '#ffcc80' }}>💎 High-Ticket Sponsor Injector</h1>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>Bypass the web scraper and forcefully inject high-paying Impact / CPA tracking links. The AI will instantly generate a full SEO blog and insert it into the active storefront.</p>
          <Link href="/admin" style={{ color: '#ff3366', textDecoration: 'none' }}>← Back to Admin Console</Link>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Deal Title (e.g. "Get $40 Off Your First Grocery Box")</label>
                <input type="text" name="title" required value={formData.title} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Brand</label>
                <input type="text" name="brand" required value={formData.brand} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} />
              </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Store Category</label>
                <select name="category" value={formData.category} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }}>
                    <option value="food">Groceries & Food</option>
                    <option value="digital">Digital Assets</option>
                    <option value="tech">Tech & Electronics</option>
                    <option value="household">Household</option>
                    <option value="travel">Travel</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Featured Price (Optional)</label>
                <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} />
              </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#00D084', fontWeight: 'bold' }}>Impact Affiliate Tracking URL *</label>
            <input type="url" name="affiliateUrl" required value={formData.affiliateUrl} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #00D084', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="https://impact.com/c/12345/67890" />
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>The raw tracking link provided by the affiliate network.</p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Direct Image URL *</label>
            <input type="url" name="imageUrl" required value={formData.imageUrl} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="https://..." />
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>Right click an image on the sponsor's website and select "Copy Image Address".</p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#ffcc80' }}>Deal Context & Selling Points (For AI Blogger)</label>
            <textarea name="context" required value={formData.context} onChange={handleChange} rows={5} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ffcc80', background: '#222', color: 'white', fontSize: '1rem', resize: 'vertical' }} placeholder="Explain what the product is and why it's a great deal. E.g. 'Get $40 off your first fresh meal kit delivery. Over 50 recipes weekly...'"></textarea>
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: '20px', padding: '15px', background: loading ? '#555' : 'linear-gradient(135deg, #00D084, #00A669)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '1px' }}>
            {loading ? '🤖 AI is Cooking the Blog... Please Wait' : '🚀 Inject Sponsor & Generate Content'}
          </button>

          {message && <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', color: message.includes('❌') ? '#ff3b30' : '#00d084' }}>{message}</div>}
        </form>
      </div>
    </main>
  );
}
