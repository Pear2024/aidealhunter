"use client";
import React, { useState } from "react";
import { Sparkles, Film, Copy, Check, Wand2, Loader2 } from "lucide-react";

export default function AIStudioPage() {
  const [product, setProduct] = useState("Éternel");
  const [audience, setAudience] = useState("Burned-out Executives (Age 35-50)");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  const products = [
    { name: "Éternel", desc: "Anti-aging & Cellular Resveratrol" },
    { name: "Revíve", desc: "Joint Pain & Inflammation Recovery" },
    { name: "Imúne", desc: "Immunity Booster & White Blood Cell Support" },
    { name: "GLP-THREE", desc: "Weight Management & Cravings" },
    { name: "Vitalité", desc: "Daily Foundational Nutrition & Energy" }
  ];

  const generateAd = async () => {
    setLoading(true);
    setResult(null);
    try {
      const selectedDev = products.find(p => p.name === product);
      const response = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: selectedDev.name, productDesc: selectedDev.desc, audience })
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
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Product to Promote:</label>
              <select 
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {products.map(p => <option key={p.name} value={p.name}>{p.name} - {p.desc}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience / Pain Point:</label>
              <input 
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Elderly with joint pain, Moms trying to lose weight..."
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
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

      </div>
    </div>
  );
}
