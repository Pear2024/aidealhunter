'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Users, Film, HeartPulse, Calculator, LayoutTemplate } from 'lucide-react';

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

          <Link href="/studio" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#8b5cf6] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6]">
                          <Film size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Nadania AI Studio</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Generate Hollywood-level cinematic video and audio ads instantly.</p>
              </div>
          </Link>

          <Link href="/wellness" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#10b981] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#10b981]/20 text-[#10b981]">
                          <HeartPulse size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Nadania Wellness</h3>
                  </div>
                  <p className="text-gray-400 text-sm">View and manage the core Wellness platform storefront.</p>
              </div>
          </Link>

          <Link href="/tools/cellular-age-calculator" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#f59e0b] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#f59e0b]/20 text-[#f59e0b]">
                          <Calculator size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Age Calculator</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Access the Clinical Cellular Age verification assessment tool.</p>
              </div>
          </Link>
          <Link href="/prompt-builder" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#ec4899] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#ec4899]/20 text-[#ec4899]">
                          <LayoutTemplate size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Prompt Builder</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Construct flawless AI text prompts using the ultimate 6-pillar framework.</p>
              </div>
          </Link>
          <Link href="/image-prompt" style={{ textDecoration: 'none' }}>
              <div className="p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-[#3b82f6] transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-[#3b82f6]/20 text-[#3b82f6]">
                          <Film size={24} />
                      </div>
                      <h3 className="font-bold text-xl text-white m-0 p-0 border-none">Image Prompt Builder</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Create breathtaking Midjourney/DALL-E image prompts using the visual composition formula.</p>
              </div>
          </Link>
      </div>

    </main>
  );
}
