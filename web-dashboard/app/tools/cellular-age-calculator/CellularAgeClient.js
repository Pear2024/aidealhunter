'use client';

import React, { useState } from 'react';
import { Activity, Beaker, ArrowRight, Loader2 } from 'lucide-react';

export default function CellularAgeClient() {
  const [realAge, setRealAge] = useState('');
  const [stressLevel, setStressLevel] = useState('');
  const [energyLevel, setEnergyLevel] = useState('');
  const [sleepQuality, setSleepQuality] = useState('');
  const [dietHabits, setDietHabits] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCalculate = async () => {
    if (!realAge || !stressLevel || !energyLevel || !sleepQuality || !dietHabits) {
        alert("Please fill out all fields to get an accurate cellular calculation.");
        return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tools/cellular-age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realAge, stressLevel, energyLevel, sleepQuality, dietHabits })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.diagnosis);
        if (typeof window !== 'undefined' && window.fbq) {
            window.fbq('track', 'Lead');
        }
      } else {
        alert("Server error. Please try again later.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {!result ? (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
           <h2 className="text-2xl font-bold mb-6 text-slate-800">Enter Your Biomarkers</h2>
           
           <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Your Chronological Age</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 35"
                  value={realAge}
                  onChange={e => setRealAge(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Stress Level</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-blue-500"
                    value={stressLevel}
                    onChange={e => setStressLevel(e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Very Low (Relaxed)">Very Low (Relaxed)</option>
                    <option value="Moderate (Normal Workday)">Moderate (Normal Workday)</option>
                    <option value="High (Constant Pressure)">High (Constant Pressure)</option>
                    <option value="Extreme (Burnout/Anxious)">Extreme (Burnout/Anxious)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Afternoon Energy</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-blue-500"
                    value={energyLevel}
                    onChange={e => setEnergyLevel(e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Consistent all day">Consistent all day</option>
                    <option value="Slight dip around 2-3PM">Slight dip around 2-3PM</option>
                    <option value="Heavy crash, need coffee">Heavy crash, need coffee/sugar</option>
                    <option value="Exhausted entirely">Exhausted almost constantly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Sleep Quality</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-blue-500"
                    value={sleepQuality}
                    onChange={e => setSleepQuality(e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Excellent (Deep, Restful)">Excellent (Deep, Restful)</option>
                    <option value="Fair (Occasional Wakeups)">Fair (Occasional Wakeups)</option>
                    <option value="Poor (Trouble falling asleep)">Poor (Trouble falling asleep)</option>
                    <option value="Wake up feeling tired">Always wake up feeling unrefreshed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Diet & Nutrition</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-blue-500"
                    value={dietHabits}
                    onChange={e => setDietHabits(e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Whole foods, mostly organic">Whole foods, mostly organic/clean</option>
                    <option value="Standard diet, some processed">Standard diet, some processed food</option>
                    <option value="Highly processed/Fast Food">Highly processed/Fast food frequent</option>
                    <option value="Take random basic vitamins">I pop random drug-store vitamins</option>
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleCalculate}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform transform active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-blue-500/30"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Activity size={20} />} 
                  {loading ? "Analyzing Cellular Biomarkers..." : "Calculate My Cellular Age"} 
                  {!loading && <ArrowRight size={20} />}
                </button>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-blue-100">
           <div 
              className="prose prose-slate max-w-none prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: result }}
            />
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button 
                onClick={() => setResult(null)}
                className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                ← Recalculate
              </button>
            </div>
        </div>
      )}
    </div>
  );
}
