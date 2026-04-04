'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Users, BarChart3 } from 'lucide-react';

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
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px' }}>
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Go back to Public Storefront</Link>
          <Link href="/admin/analytics" style={{ color: 'var(--success)', textDecoration: 'none' }}>View Analytics 📈</Link>
          <Link href="/admin/agents" style={{ color: '#ff9a9e', textDecoration: 'none', fontWeight: 'bold' }}>AI Overlord 🌌 →</Link>
        </div>
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
          
          <Link href="/admin/analytics" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#00D084] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#00D084]/20 text-[#00D084]">
                          <BarChart3 size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Web Analytics</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Monitor live traffic, user journeys, conversion events, and engagement.</p>
              </div>
          </Link>

      </div>
    </main>
  );
}
