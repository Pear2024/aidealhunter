"use client";
import React, { useState } from "react";
import { Sparkles, Film, Copy, Check, Wand2, Loader2 } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', stack: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error.message, stack: error.stack };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 text-red-900 min-h-screen">
          <h1 className="text-3xl font-bold mb-4">React Render Error</h1>
          <p className="font-mono bg-red-100 p-4 rounded mb-4">{this.state.message}</p>
          <pre className="text-xs max-w-full overflow-x-auto">{this.state.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AIStudioPage() {
  return (
    <ErrorBoundary>
      <StudioPageContent />
    </ErrorBoundary>
  );
}

function StudioPageContent() {
  const [symptom, setSymptom] = useState("Chronic Fatigue & Brain Fog");
  const [audience, setAudience] = useState("Women 40+ wanting to reverse cellular aging");
  const [tone, setTone] = useState("Over-the-top Hollywood Comedy");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  const symptomList = [
    { symptom: "Anti-Aging", product: "Éternel", audience: "Women 40+ wanting to reverse cellular aging" },
    { symptom: "Antioxidant Protection", product: "Éternel", audience: "Health-conscious individuals seeking longevity" },
    { symptom: "Blood Sugar Support", product: "GLP-THREE", audience: "People struggling with cravings and blood sugar crashes" },
    { symptom: "Blood Pressure Support", product: "Vitalité", audience: "Stressed adults over 40 needing heart support" },
    { symptom: "Bone Health", product: "Revíve", audience: "Aging parents experiencing physical decline" },
    { symptom: "Brain Health / Memory", product: "Vitalité", audience: "Professionals dealing with severe afternoon brain fog" },
    { symptom: "Daily Nutritional Needs", product: "Vitalité", audience: "Busy individuals relying on fast food and cheap vitamins" },
    { symptom: "Detoxification / Liver / Kidney", product: "Purífi", audience: "People feeling perpetually sluggish and congested" },
    { symptom: "Digestive / Gut Health", product: "Purífi", audience: "Individuals plagued by bloating and poor digestion" },
    { symptom: "Energy", product: "Kynetik", audience: "Burned-out workers needing intense natural stamina" },
    { symptom: "Eye Health", product: "Vitalité", audience: "Tech workers experiencing daily digital eye strain" },
    { symptom: "Heart Health", product: "Éternel", audience: "Health-conscious executives securing their cardiovascular future" },
    { symptom: "Hormone Health", product: "Éternel", audience: "Women experiencing imbalances and daily mood swings" },
    { symptom: "Hydration", product: "Kynetik", audience: "Active people struggling with chronic dehydration" },
    { symptom: "Inflammatory / Joint / Muscle", product: "Revíve", audience: "Former athletes crippled by chronic knee and back pain" },
    { symptom: "Immune Support / Lung", product: "Imúne", audience: "Travelers and parents who catch every cold" },
    { symptom: "Metabolism / Weight", product: "GLP-THREE", audience: "Moms struggling to lose stubborn postpartum belly fat" },
    { symptom: "Mood Support", product: "Kynetik", audience: "Overwhelmed professionals seeking mental clarity and joy" },
    { symptom: "Nerve Health", product: "Revíve", audience: "Individuals dealing with nerve tension and oxidative stress" },
    { symptom: "Post-Exercise Recovery", product: "Revíve", audience: "Fitness enthusiasts whose bodies take too long to heal" },
    { symptom: "Sleep", product: "Vitalité", audience: "Restless sleepers unable to achieve deep REM cycles" },
    { symptom: "Skin, Hair & Nails", product: "Collagène", audience: "Beauty-focused women combating hair thinning and dull skin" },
    { symptom: "Urinary Health", product: "Purífi", audience: "Individuals prone to poor urinary tract balance" },
    { symptom: "Women's Health", product: "Éternel", audience: "Women navigating life transitions demanding cellular support" }
  ];

  const handleSymptomChange = (newSymptom) => {
    setSymptom(newSymptom);
    const found = symptomList.find(s => s.symptom === newSymptom);
    if (found) {
      setAudience(found.audience);
    }
  };

  const viralHooks = [
    "High-income professionals experiencing severe burnout and brain fog",
    "Moms over 35 who have zero energy left at the end of the day",
    "Aging adults who are terrified of losing their physical independence",
    "Corporate executives suffering from chronic stress and poor sleep",
    "Fitness enthusiasts who keep getting injured and heal too slowly",
    "Women in their 40s noticing rapid aging and hormonal shifts",
    "People who have spent thousands on doctors but still feel terrible",
    "Individuals suffering from chronic, unexplained inflammation and pain",
    "Tech workers suffering from horrible posture, eye strain, and headaches",
    "People desperately trying to lose stubborn belly fat and failing"
  ];

  const autoSuggestAudience = () => {
    const randomHook = viralHooks[Math.floor(Math.random() * viralHooks.length)];
    setAudience(randomHook);
  };

  const generateAd = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptom, audience, tone })
      });
      const data = await response.json();
      setResult(data);
    } catch (e) {
      alert("Error generating script.");
    }
    setLoading(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-6">
        
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm border border-emerald-200">
            <Film size={32} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Nadania AI Studio</h1>
          <p className="text-slate-500 mt-2 text-lg">Generate Hollywood-level Cinematic Ads for Google Flow / Veo 3</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden mb-8">
          <div className="p-8 border-b border-slate-100 bg-slate-900 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wand2 size={20} className="text-emerald-400" />
              Campaign Settings
            </h2>
          </div>
          
          <div className="p-8 grid md:grid-cols-2 gap-8">
            {/* Left Column: The Problem */}
            <div className="space-y-6">
              {/* Symptom Select */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">1. Select Target Symptom / Goal:</label>
                <select 
                  value={symptom}
                  onChange={(e) => handleSymptomChange(e.target.value)}
                  className="w-full p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 focus:ring-2 focus:ring-blue-500 font-bold outline-none cursor-pointer"
                >
                  {symptomList.map(item => <option key={item.symptom} value={item.symptom}>{item.symptom}</option>)}
                </select>
              </div>

              {/* Tone Select */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Cinematic Tone:</label>
                <select 
                  value={tone} 
                  onChange={e => setTone(e.target.value)}
                  className="w-full p-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="Over-the-top Hollywood Comedy">🤣 Hollywood Comedy (Absurdity)</option>
                  <option value="Dark Cinematic Drama">🕷️ Dark Cinematic Drama (Intense)</option>
                  <option value="Scientific Documentary">🧬 Scientific Documentary (Clinical)</option>
                </select>
              </div>
              
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">3. Fine-tune the Audience Hook:</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Describe specific pain point..."
                    className="w-full p-4 pr-14 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={autoSuggestAudience}
                    title="Auto-Suggest Magical Hook"
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Wand2 size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: The Solution (Auto-matched) */}
            <div className="bg-emerald-50 rounded-xl p-8 border border-emerald-200 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={120} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-emerald-900 mb-2 relative z-10">Curiosity Gap Strategy</h3>
              <p className="text-emerald-800 text-md relative z-10 font-medium">
                We will <span className="font-bold underline text-emerald-900">NOT</span> mention any products in this Ad. 
              </p>
              <p className="mt-4 text-emerald-700 text-sm italic relative z-10">
                Instead of selling directly, the AI will hook <strong>{audience}</strong> by agitating their <strong>{symptom}</strong>, and then force them to visit <strong>Nadania Wellness</strong> for a Free Clinical AI Assessment to find the cure. This massively increases click-through rates.
              </p>
            </div>
          </div>
          
          <div className="px-8 pb-8">
            <button 
              onClick={generateAd}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={24}/>}
              {!loading && <Sparkles size={24}/>}
              <span>{loading ? "Brainstorming Cinematic Ad..." : "Generate Hollywood Ad"}</span>
            </button>
          </div>
        </div>

        <div className="dynamic-result-wrapper">
          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <h2 className="text-2xl font-black text-emerald-900">{result.title}</h2>
                <p className="text-emerald-700 mt-2"><strong>Viral Rationale:</strong> <span>{result.rationale}</span></p>
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-8 animate-in fade-in duration-500">
                  <div className="bg-slate-800 px-6 py-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-emerald-400"/> Director's Timeline (Veo 3)</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {result.scenes?.map((scene, i) => (
                      <div key={i} className="p-0 flex flex-col md:flex-row hover:bg-slate-50 transition-colors">
                        {/* --- TIMELINE COLUMN --- */}
                        <div className="md:w-48 bg-slate-50/50 p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col items-center justify-center shrink-0">
                          <div className="bg-emerald-100 text-emerald-800 font-black text-xl px-4 py-2 rounded-xl text-center shadow-sm border border-emerald-200 inline-block font-mono tracking-tighter w-full">
                            {scene.timestamp || `${i * 5}s-${(i + 1) * 5}s`}
                          </div>
                          <h3 className="font-bold text-slate-700 mt-3 text-center text-sm uppercase tracking-wider">{scene.concept}</h3>
                          <div className="mt-1 text-[10px] font-bold text-slate-400">SCENE {scene.scene || i+1}</div>
                        </div>
                        
                        {/* --- CONTENT GRID --- */}
                        <div className="p-6 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Video Prompt */}
                          <div className="relative group flex flex-col h-full bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><span className="text-sm">📹</span> VIDEO (FLOW)</p>
                            <div className="text-sm text-slate-700 font-medium pb-8 leading-relaxed">{scene.video_prompt}</div>
                            <button onClick={() => copyToClipboard(scene.video_prompt, `video_${i}`)} className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-emerald-600 transition-colors">
                              {copied === `video_${i}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>

                          {/* Audio Prompt */}
                          <div className="relative group flex flex-col h-full bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><span className="text-sm">🎵</span> AUDIO FX</p>
                            <div className="text-sm text-blue-800 font-medium pb-8 leading-relaxed">{scene.audio_prompt}</div>
                            <button onClick={() => copyToClipboard(scene.audio_prompt, `audio_${i}`)} className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-sm border border-blue-200 text-blue-500 hover:text-blue-600 transition-colors">
                              {copied === `audio_${i}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>

                          {/* Voiceover Prompt */}
                          <div className="relative group flex flex-col h-full bg-purple-50 p-5 rounded-xl border border-purple-100 shadow-sm">
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><span className="text-sm">🎤</span> VOICEOVER</p>
                            <div className="text-sm text-purple-800 font-bold italic pb-8 leading-relaxed">"{scene.voiceover}"</div>
                            <button onClick={() => copyToClipboard(scene.voiceover, `vo_${i}`)} className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-sm border border-purple-200 text-purple-500 hover:text-purple-600 transition-colors">
                              {copied === `vo_${i}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
