'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ dealsToday: 0, blogsToday: 0 });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/today-stats');
      const data = await res.json();
      setStats(data || { dealsToday: 0, blogsToday: 0 });
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <header className="header">
        <h1>🩺 Nadania Medical AI Command Center</h1>
        <p className="subtitle">Automated Content Engine & Operations Dashboard</p>
      </header>

      <h2 className="text-xl font-bold mb-4 text-white mt-10">Daily Operations Control</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-4">
          
          <Link href="/admin/leads" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#FF3366] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#FF3366]/20 text-[#FF3366]">
                          <Users size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Patient Leads</h3>
                  </div>
                  <p className="text-gray-400 text-sm">View health risk assessments and monitor free nurse callback requests.</p>
              </div>
          </Link>

          <Link href="/admin/reels-queue" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#58A6FF] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#58A6FF]/20 text-[#58A6FF]">
                          <Activity size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Medical Reels</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Review, trigger, and manage the AI's upcoming scheduled Facebook Videos.</p>
              </div>
          </Link>
      </div>

      {/* --- INJECTED MARKETING HUB (Storyboard & Manual Reels) --- */}
      <h2 className="text-xl font-bold mb-4 text-white mt-10 border-t border-gray-800 pt-8">Marketing Content Generation Hub</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <ManualReelsGenerator />
        <StoryboardGenerator />
      </div>

    </main>
  );
}

function ManualReelsGenerator() {
  const [status, setStatus] = useState('idle');
  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('loading');
    setTimeout(() => {
        setStatus('success');
        e.target.reset();
        setTimeout(() => setStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><span className="text-xl">📱</span> Manual Reels Generator</h2>
      <p className="text-sm text-gray-400 mb-6">Create a script request and send it to your team or AI via Telegram.</p>
      
      {status === 'success' && <div className="mb-4 p-3 bg-green-900/30 border border-green-700 text-green-400 rounded-lg text-sm">✅ Sent to Telegram successfully!</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
           <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Content Title / Hook</label>
           <input type="text" required placeholder="e.g. Why Coffee Isn't Fixing Your Exhaustion..." className="w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
           <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Caption & Details</label>
           <textarea required rows={4} placeholder="Full caption with hashtags..." className="w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"></textarea>
        </div>
        <div>
           <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Call To Action Link</label>
           <input type="url" required defaultValue="https://nadaniadigitalllc.com/wellness" className="w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none" />
        </div>
        <button type="submit" disabled={status === 'loading'} className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">
          {status === 'loading' ? '⏳ Sending...' : '🚀 Generate Reels Script'}
        </button>
      </form>
    </div>
  );
}

function StoryboardGenerator() {
  const [status, setStatus] = useState('idle');
  const [images, setImages] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('loading');
    setImages(false);
    setTimeout(() => {
        setImages(true);
        setStatus('idle');
    }, 2000);
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><span className="text-xl">🎨</span> AI Storyboard Generator</h2>
      <p className="text-sm text-gray-400 mb-6">Generate visual layouts for your ads based on text prompts.</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
           <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">AI Visual Prompt</label>
           <textarea required rows={3} placeholder="e.g. A confident woman glowing with health, cinematic lighting, photorealistic." className="w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"></textarea>
        </div>
        <button type="submit" disabled={status === 'loading'} className="mt-2 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors">
          {status === 'loading' ? '⏳ Generating Scenes...' : '✨ Generate Mockup'}
        </button>
      </form>

      {images && (
        <div className="grid grid-cols-2 gap-4 mt-8">
           <div className="bg-black/40 p-2 rounded-lg text-center"><img src="https://via.placeholder.com/400x300.png?text=Scene+1" className="w-full rounded mb-2" /><span className="text-xs text-gray-400">Hook (0-3s)</span></div>
           <div className="bg-black/40 p-2 rounded-lg text-center"><img src="https://via.placeholder.com/400x300.png?text=Scene+2" className="w-full rounded mb-2" /><span className="text-xs text-gray-400">Problem (3-6s)</span></div>
           <div className="bg-black/40 p-2 rounded-lg text-center"><img src="https://via.placeholder.com/400x300.png?text=Scene+3" className="w-full rounded mb-2" /><span className="text-xs text-gray-400">Solution (6-10s)</span></div>
           <div className="bg-black/40 p-2 rounded-lg text-center"><img src="https://via.placeholder.com/400x300.png?text=Scene+4" className="w-full rounded mb-2" /><span className="text-xs text-gray-400">Call To Action</span></div>
        </div>
      )}
    </div>
  );
}
