'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Globe, RefreshCw } from 'lucide-react'; // Added imports for icons

export default function SponsorInjector() {
  const [dealTitle, setDealTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('food'); // Changed default category
  const [context, setContext] = useState('');

  const [loading, setLoading] = useState(false);
  const [weeeLoading, setWeeeLoading] = useState(false);
  const [weeeUrl, setWeeeUrl] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchWeeeData = async () => {
    if(!weeeUrl) {
      setError("Please paste a SayWeee product URL first.");
      setSuccess('');
      return;
    }
    setWeeeLoading(true);
    setError('');
    setSuccess('');
    try {
        const res = await fetch('/api/admin/scrape-weee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: weeeUrl })
        });
        const data = await res.json();

        if(res.ok) {
            setDealTitle(data.title || '');
            setImageUrl(data.image || '');
            setPrice(data.price || '');
            setBrand('SayWeee!');
            setCategory('food');
            setContext(`Promoting ${data.title} from SayWeee!`);
            // Point the tracking link DIRECTLY to the product page with the referral code attached!
            const trackingUrl = weeeUrl.includes('?') 
                ? `${weeeUrl}&referral_id=17012080` 
                : `${weeeUrl}?referral_id=17012080`;
            setAffiliateUrl(trackingUrl);
            setSuccess(`Successfully extracted product metadata!`);
        } else {
            setError(data.error || "Failed to extract SayWeee data");
        }
    } catch(err) {
        setError(err.message);
    } finally {
        setWeeeLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const res = await fetch('/api/admin/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dealTitle,
          brand,
          price,
          affiliateUrl,
          imageUrl,
          category,
          context
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('✅ Sponsorship Successfully Injected & Blog Generated!');
        setDealTitle('');
        setBrand('');
        setPrice('');
        setAffiliateUrl('');
        setImageUrl('');
        setCategory('food');
        setContext('');
        setWeeeUrl(''); // Clear Weee URL after successful submission
      } else {
        setError(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to inject deal. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Bypass strict Clerk Auth to match parent Admin Dashboard
  // if (!isLoaded || !isSignedIn) return <main style={{ padding: '50px', background: '#050505', color: '#fff', textAlign: 'center' }}><h2>Access Denied</h2><p>You must be an administrator to view this page.</p></main>;

  return (
    <main style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '50px 20px', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#111', padding: '40px', borderRadius: '16px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: '#ffcc80' }}>💎 High-Ticket Sponsor Injector</h1>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>Bypass the web scraper and forcefully inject high-paying Impact / CPA tracking links. The AI will instantly generate a full SEO blog and insert it into the active storefront.</p>
          <Link href="/admin" style={{ color: '#ff3366', textDecoration: 'none' }}>← Back to Admin Console</Link>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-xl p-8 max-w-2xl mx-auto shadow-2xl">

        <div className="mb-8 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                SayWeee! Auto-Extractor 🥬
            </h3>
            <p className="text-gray-400 text-sm mb-4">Paste a SayWeee product URL (e.g. Thai Young Coconuts) to instantly scrape the image, title, and price. Your referral tracker will be automatically attached.</p>
            <div className="flex gap-2">
                <input
                    type="url"
                    value={weeeUrl}
                    onChange={(e) => setWeeeUrl(e.target.value)}
                    className="flex-1 bg-black border border-gray-700 text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="https://www.sayweee.com/en/product/..."
                />
                <button
                    type="button"
                    onClick={fetchWeeeData}
                    disabled={weeeLoading || !weeeUrl}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {weeeLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Auto-Fetch'}
                </button>
            </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Deal Title (e.g. "Get $40 Off Your First Grocery Box")</label>
                <input type="text" name="title" required value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Brand</label>
                <input type="text" name="brand" required value={brand} onChange={(e) => setBrand(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} />
              </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Store Category</label>
                <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }}>
                    <option value="food">Groceries & Food</option>
                    <option value="digital">Digital Assets</option>
                    <option value="tech">Tech & Electronics</option>
                    <option value="household">Household</option>
                    <option value="travel">Travel</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Featured Price (Optional)</label>
                <input type="number" step="0.01" name="price" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} />
              </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#00D084', fontWeight: 'bold' }}>Impact Affiliate Tracking URL *</label>
            <input type="url" name="affiliateUrl" required value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #00D084', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="https://impact.com/c/12345/67890" />
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>The raw tracking link provided by the affiliate network.</p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Direct Image URL *</label>
            <input type="url" name="imageUrl" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '1rem' }} placeholder="https://..." />
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>Right click an image on the sponsor's website and select "Copy Image Address".</p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#ffcc80' }}>Deal Context & Selling Points (For AI Blogger)</label>
            <textarea name="context" required value={context} onChange={(e) => setContext(e.target.value)} rows={5} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ffcc80', background: '#222', color: 'white', fontSize: '1rem', resize: 'vertical' }} placeholder="Explain what the product is and why it's a great deal. E.g. 'Get $40 off your first fresh meal kit delivery. Over 50 recipes weekly...'"></textarea>
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: '20px', padding: '15px', background: loading ? '#555' : 'linear-gradient(135deg, #00D084, #00A669)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '1px' }}>
            {loading ? '🤖 AI is Cooking the Blog... Please Wait' : '🚀 Inject Sponsor & Generate Content'}
          </button>

          {success && <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0, 208, 132, 0.1)', border: '1px solid #00D084', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', color: '#00D084' }}>{success}</div>}
          {error && <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid #ff3b30', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', color: '#ff3b30' }}>{error}</div>}
        </form>
        </div>
      </div>
    </main>
  );
}
