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
  const [symptom, setSymptom] = useState("Anti-Aging");
  const [audience, setAudience] = useState("Women 40+ wanting to reverse cellular aging");
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
        body: JSON.stringify({ symptom, audience })
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
              
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Fine-tune the Audience Hook:</label>
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
              {loading ? <><Loader2 className="animate-spin" size={24}/> Brainstorming Cinematic Ad...</> : <><Sparkles size={24}/> Generate Hollywood Ad</>}
            </button>
          </div>
        </div>

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <h2 className="text-2xl font-black text-emerald-900">{result.title}</h2>
              <p className="text-emerald-700 mt-2"><strong>Viral Rationale:</strong> {result.rationale}</p>
            </div>

            {result.scenes?.map((scene, i) => (
              <div key={i} className="bg-white border text-slate-800 border-slate-200 overflow-hidden shadow-sm rounded-2xl">
                <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">Scene {scene.scene}: {scene.concept}</h3>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* --- AI STORYBOARD VISUAL MOCKUP (4 VARIATIONS) --- */}
                   <div className="w-full relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                     <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" />
                        AI Storyboard Mockup (4 Variations)
                     </div>
                     <div className="grid grid-cols-2 gap-1 p-1">
                       {[1, 2, 3, 4].map(idx => {
                         const safePrompt = (scene.video_prompt || scene.concept).substring(0, 200).replace(/[^a-zA-Z0-9 ]/g, ' ').trim().replace(/\s+/g, ' ');
                         return (
                           <div key={idx} className="aspect-video relative overflow-hidden rounded-lg bg-slate-200">
                             <img 
                               src={`https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt + " photorealistic 8k cinematic lighting")}?width=400&height=225&nologo=true&seed=${(scene.scene || 1) * 100 + idx}`} 
                               alt={`${scene.concept} variation ${idx}`}
                               className="w-full h-full object-cover"
                               loading="lazy"
                             />
                           </div>
                         );
                       })}
                     </div>
                  </div>

                  {/* Video Prompt */}
                  <div className="relative group">
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">📹 Video Prompt (Paste in Google Flow)</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 font-medium pr-12">
                      {scene.video_prompt}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(scene.video_prompt, `video_${i}`)}
                      className="absolute top-8 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition"
                    >
                      {copied === `video_${i}` ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>

                  {/* Audio Prompt */}
                  <div className="relative group">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">🎵 Audio Prompt (Sound Fx & Music)</p>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 font-medium pr-12">
                      {scene.audio_prompt}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(scene.audio_prompt, `audio_${i}`)}
                      className="absolute top-8 right-2 p-2 bg-white rounded-lg shadow-sm border border-blue-200 hover:bg-blue-100 text-blue-600 transition"
                    >
                      {copied === `audio_${i}` ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>

                  {/* Voiceover */}
                  <div className="relative group">
                    <p className="text-xs font-bold text-purple-600 uppercase mb-1">🎤 Voiceover Script (Speech)</p>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-purple-800 font-bold italic pr-12">
                      "{scene.voiceover}"
                    </div>
                    <button 
                      onClick={() => copyToClipboard(scene.voiceover, `vo_${i}`)}
                      className="absolute top-8 right-2 p-2 bg-white rounded-lg shadow-sm border border-purple-200 hover:bg-purple-100 text-purple-600 transition"
                    >
                      {copied === `vo_${i}` ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* --- INJECTED STORYBOARD GENERATOR --- */}
      <h2 className="text-xl font-bold mb-4 text-slate-900 mt-12 border-t border-slate-200 pt-8">Custom AI Storyboard Generator</h2>
      <div className="mb-12">
        <StoryboardGenerator />
      </div>

      </div>
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
    <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-slate-800"><span className="text-xl">🎨</span> Custom Visual AI Storyboard</h2>
      <p className="text-sm text-slate-500 mb-6">Type a custom prompt to generate an instant 4-scene storyboard mockup.</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">AI Visual Prompt</label>
           <textarea required rows={3} placeholder="e.g. A confident woman glowing with health, cinematic lighting, photorealistic." className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"></textarea>
        </div>
        <button type="submit" disabled={status === 'loading'} className="mt-2 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors">
          {status === 'loading' ? '⏳ Generating Custom Scenes...' : '✨ Generate Mockup Grid'}
        </button>
      </form>

      {images && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
           <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center"><img src="https://image.pollinations.ai/prompt/Hook%20cinematic%20lighting" className="w-full aspect-video object-cover rounded mb-2" /><span className="text-xs text-slate-600 font-bold">1: Hook (0-3s)</span></div>
           <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center"><img src="https://image.pollinations.ai/prompt/Problem%20cinematic%20lighting" className="w-full aspect-video object-cover rounded mb-2" /><span className="text-xs text-slate-600 font-bold">2: Problem (3-6s)</span></div>
           <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center"><img src="https://image.pollinations.ai/prompt/Solution%20product%20cinematic%20lighting" className="w-full aspect-video object-cover rounded mb-2" /><span className="text-xs text-slate-600 font-bold">3: Solution (6-10s)</span></div>
           <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center"><img src="https://image.pollinations.ai/prompt/Call%20to%20action%20cinematic%20lighting" className="w-full aspect-video object-cover rounded mb-2" /><span className="text-xs text-slate-600 font-bold">4: Call To Action</span></div>
        </div>
      )}
    </div>
  );
}
