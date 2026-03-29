"use client";
import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, Zap, Microscope, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-emerald-200">
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 transition-all bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="text-white" size={24} />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              Nadania<span className="text-emerald-600 font-light">Wellness</span>
            </span>
          </div>
          <div className="hidden md:flex flex-1 justify-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#science" className="hover:text-emerald-600 transition-colors">The Science</a>
            <a href="#nutrition" className="hover:text-emerald-600 transition-colors">Cellular Nutrition</a>
            <a href="#ai" className="hover:text-emerald-600 transition-colors">AI Diagnostics</a>
          </div>
          <Link href="/wellness" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md active:scale-95">
            Take Assessment
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img 
              src="https://plus.unsplash.com/premium_photo-1661777196224-bfda51e61cfd?q=80&w=2070&auto=format&fit=crop" 
              alt="Background" 
              className="w-full h-full object-cover opacity-[0.03]"
           />
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-medium text-sm mb-8 ring-1 ring-emerald-600/20">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            Clinical AI System Online
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8 max-w-4xl mx-auto">
            Understand Your Body.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Transform Your Health.</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Trusted Health Knowledge powered by Nature & Advanced Medical AI. Bridge the gap between clinical science and holistic cellular nutrition.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/wellness" className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-transform active:scale-95 group">
              Start Free Assessment <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Partners / Trust Banner */}
      <section className="py-10 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-semibold text-slate-400 mb-6 tracking-wider uppercase">Backed By Science & Distributed Globally</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale">
            {/* Dummy logos representing PDR, Science, FDA standards etc. */}
            <div className="text-xl font-bold flex items-center gap-1"><ShieldCheck size={28}/> PDR Listed</div>
            <div className="text-xl font-black flex items-center gap-1">GMP CERTIFIED</div>
            <div className="text-xl font-bold flex items-center gap-1"><Microscope size={28}/> CLINICAL GRADE</div>
            <div className="text-xl font-serif italic font-bold">Nature+Tech</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50" id="science">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">The Future of Holistic Healing</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">We combine the rigorous validation of western medical data with the absolute purity of holistic ingredients.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group cursor-default">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Diagnostics</h3>
              <p className="text-slate-600 leading-relaxed">Our clinical AI engine analyzes your specific symptoms to map out your root-cause deficiencies instantly.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group cursor-default">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Microscope size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cellular Absorption</h3>
              <p className="text-slate-600 leading-relaxed">PDR-listed Liposomal technology ensures that vital nutrients bypass digestive destruction to enter your cells directly.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group cursor-default">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Bio-active Ingredients</h3>
              <p className="text-slate-600 leading-relaxed">Sourced from the earth. We only recommend pharmaceutical-grade holistic nutrition that transforms lives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cellular Nutrition Section */}
      <section className="py-24 bg-white" id="nutrition">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="/nutrition-bg.jpg" 
                  alt="Cellular Nutrition" 
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/40 to-transparent"></div>
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm mb-6">
                <Zap size={16} /> Maximum Bioavailability
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                Nutrition that actually <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">enters your cells.</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Traditional supplements are destroyed by stomach acid, with less than 20% absorption. We utilize PDR-certified <strong>Liposomal Technology</strong>—wrapping vital nutrients in microscopic protective bubbles that bypass digestion and absorb directly into your cellular walls.
              </p>
              
              <ul className="space-y-4 mb-10">
                 <li className="flex items-start gap-3">
                   <div className="mt-1 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 size={14} /></div>
                   <span className="text-slate-700"><strong>90%+ Absorption Rate</strong> compared to standard pills</span>
                 </li>
                 <li className="flex items-start gap-3">
                   <div className="mt-1 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 size={14} /></div>
                   <span className="text-slate-700"><strong>Physician's Desk Reference (PDR)</strong> certified efficacy</span>
                 </li>
                 <li className="flex items-start gap-3">
                   <div className="mt-1 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 size={14} /></div>
                   <span className="text-slate-700"><strong>Holistic purity</strong> backed by clinical science</span>
                 </li>
              </ul>
              
              <Link href="/wellness" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-emerald-600 transition-colors shadow-lg">
                Find Your Protocol <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden bg-slate-900" id="ai">
        <div className="absolute inset-0 opacity-10">
           <img src="https://images.unsplash.com/photo-1530213786676-41ce9f481c5d?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="Cells" />
        </div>
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Read the Signs Your Body is Sending.</h2>
          <p className="text-xl text-slate-300 mb-10">Stop guessing. Let our AI medical engine map out your personalized path to optimal longevity.</p>
          <Link href="/wellness" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-emerald-50 transition-colors shadow-2xl active:scale-95">
            Get Your Protocol Now <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="text-emerald-600" size={20} />
            <span className="font-bold text-lg text-slate-900">Nadania<span className="text-emerald-600 font-light">Wellness</span></span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 Nadania Digital LLC. All rights reserved. Technology powered by Medical AI.</p>
        </div>
      </footer>
    </div>
  );
}
