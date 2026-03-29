"use client";
import React, { useState } from 'react';
import { Activity, Beaker, Leaf, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function WellnessAI() {
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [lifestyle, setLifestyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);

  const handleDiagnose = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms, duration, lifestyle })
      });
      const data = await res.json();
      if (data.success) {
        setDiagnosis(data.diagnosis);
        setStep(3);
      }
    } catch (e) {
      console.error(e);
      alert("System Overload. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-teal-200">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-teal-600" size={24} />
            <span className="font-bold text-xl tracking-tight">Nadania<span className="text-teal-600 font-light">AI Diagnostics</span></span>
          </div>
          <div className="text-sm font-medium text-slate-500 flex items-center gap-1">
            <CheckCircle2 size={16} className="text-green-500" /> Clinical System Online
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {step === 1 && (
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-slate-100 ring-1 ring-slate-900/5">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
              Personalized Health Analysis. <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Powered by AI.</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-xl">
              Describe your current symptoms or health goals, and our core Medical AI will synthesize a pharmaceutical and holistic cellular protocol specifically for you.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">1. What are your primary symptoms or concerns?</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none h-32 text-base"
                  placeholder="e.g. Chronic fatigue in the afternoon, brain fog, and occasional joint pain."
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">2. How long has this been occurring?</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-teal-500"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                  >
                    <option value="">Select duration...</option>
                    <option value="Just started">A few days</option>
                    <option value="A few weeks">A few weeks</option>
                    <option value="Months">Several months</option>
                    <option value="Years">Years (Chronic)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">3. Primary Lifestyle Factor</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-teal-500"
                    value={lifestyle}
                    onChange={e => setLifestyle(e.target.value)}
                  >
                    <option value="">Select factor...</option>
                    <option value="High Stress Work">High Stress Work</option>
                    <option value="Poor Sleep Quality">Poor Sleep Quality</option>
                    <option value="Irregular Diet / Processed Foods">Poor Diet</option>
                    <option value="Highly Active / Athlete">Athlete Recovery</option>
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => {
                    if (symptoms && duration && lifestyle) {
                        setStep(2); handleDiagnose();
                    } else alert("Please fill incomplete medical fields.")
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform transform active:scale-[0.98] shadow-lg shadow-slate-900/20"
                >
                  <Beaker size={20} /> Run Clinical Analysis <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3">AI Diagnostic Engine Running</h2>
            <p className="text-slate-500 max-w-md mx-auto animate-pulse">
              Cross-referencing your symptoms with pharmaceutical guidelines and advanced clinical liposomal protocols...
            </p>
          </div>
        )}

        {step === 3 && diagnosis && (
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-teal-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500"></div>
            
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
               <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Leaf size={24} />
               </div>
               <div>
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your Diagnostic Protocol</h2>
                 <p className="text-emerald-600 font-medium text-sm">Generated by Nadania Medical AI</p>
               </div>
            </div>

            <div 
              className="prose prose-slate max-w-none prose-h2:text-xl prose-h2:font-bold prose-h2:text-slate-800 prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:text-teal-700 prose-strong:text-slate-900 prose-p:leading-relaxed prose-a:bg-slate-900 prose-a:text-white prose-a:font-medium prose-a:px-6 prose-a:py-3 prose-a:rounded-xl prose-a:no-underline hover:prose-a:bg-slate-800 transition-all"
              dangerouslySetInnerHTML={{ __html: diagnosis }}
            />
            
            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => { setStep(1); setSymptoms(''); setDiagnosis(null); }}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← Restart Assessment
              </button>
              <div className="text-xs text-slate-400">
                Medical Disclaimer: This AI is for informational purposes.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
