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
  const [contactNurse, setContactNurse] = useState(null);
  const [nurseName, setNurseName] = useState('');
  const [nursePhone, setNursePhone] = useState('');

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

            {/* Nurse Contact Area */}
            {contactNurse === null && (
              <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center shadow-inner">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Would you like our Medical Support Nurse to contact you?</h3>
                <p className="text-slate-500 mb-6 max-w-xl mx-auto">Get personalized guidance on reducing your cellular age and understanding the protocol. 100% Free.</p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                   <button 
                     onClick={() => setContactNurse(true)}
                     className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg"
                   >
                     Yes, Contact Me (Free)
                   </button>
                   <a 
                     href="https://threeinternational.com/en/ShopProducts/1712892"
                     target="_blank"
                     rel="noreferrer"
                     onClick={() => setContactNurse(false)}
                     className="w-full md:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition-all shadow-sm block text-center"
                   >
                     No, Explore the Solution
                   </a>
                </div>
              </div>
            )}
            
            {contactNurse === true && (
              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-inner">
                <h3 className="text-xl font-bold text-blue-800 mb-4 text-center">Schedule Your Free Nurse Callback</h3>
                <div className="space-y-4 max-w-sm mx-auto">
                   <input type="text" placeholder="Your Name" value={nurseName} onChange={e => setNurseName(e.target.value)} className="w-full p-4 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 bg-white" />
                   <input type="tel" placeholder="Phone Number" value={nursePhone} onChange={e => setNursePhone(e.target.value)} className="w-full p-4 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 bg-white" />
                   <button 
                     onClick={() => {
                       if(!nurseName || !nursePhone) { alert("Please enter name and phone."); return; }
                       alert("Thank you " + nurseName + "! Our volunteer nurse will call you at " + nursePhone + " shortly.");
                       setContactNurse(false);
                     }}
                     className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
                   >
                     Request Callback Now
                   </button>
                </div>
              </div>
            )}

            {contactNurse === false && (
              <div className="mt-8 text-center p-8 bg-blue-50 rounded-2xl border border-blue-100">
                 <h3 className="text-xl font-bold text-blue-800 mb-4 text-center">Ready to begin your cellular reversal?</h3>
                 <a 
                   href="https://threeinternational.com/en/ShopProducts/1712892"
                   target="_blank"
                   rel="noreferrer"
                   className="inline-block w-full md:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-xl shadow-blue-500/30 hover:scale-105 uppercase tracking-wide"
                 >
                   Begin Cellular Reversal Now
                 </a>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button 
                onClick={() => { setResult(null); setContactNurse(null); }}
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
