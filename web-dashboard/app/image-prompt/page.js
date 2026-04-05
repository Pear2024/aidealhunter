"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Copy, Check, Info, Image as ImageIcon, Map, Sun, Camera, Palette, Sliders } from "lucide-react";

export default function ImagePromptBuilderPage() {
  const [subject, setSubject] = useState("");
  const [setting, setSetting] = useState("");
  const [lighting, setLighting] = useState("");
  const [camera, setCamera] = useState("");
  const [style, setStyle] = useState("");
  const [parameters, setParameters] = useState("");
  const [copied, setCopied] = useState(false);

  const mainPromptParts = [
    subject,
    setting,
    lighting,
    camera,
    style
  ].filter(Boolean).join(", ");

  const finalPrompt = `/imagine prompt: ${mainPromptParts}${parameters ? ' ' + parameters : ''}`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      id: "subject",
      title: "1. Subject (ตัวแบบหลัก)",
      icon: <ImageIcon className="text-blue-500" size={20} />,
      state: subject,
      setState: setSubject,
      color: "blue",
      desc: "ใคร หรือ อะไร คือจุดศูนย์กลางของภาพ? อธิบายให้ละเอียดที่สุด",
      example: "A futuristic cyber-monk wearing glowing neon robes"
    },
    {
      id: "setting",
      title: "2. Setting (สถานที่/พื้นหลัง)",
      icon: <Map className="text-emerald-500" size={20} />,
      state: setting,
      setState: setSetting,
      color: "emerald",
      desc: "เหตุการณ์นี้เกิดขึ้นที่ไหน? สภาพแวดล้อมเป็นอย่างไร?",
      example: "walking through a crowded, rainy cyberpunk Tokyo street alley"
    },
    {
      id: "lighting",
      title: "3. Lighting (แสงและบรรยากาศ)",
      icon: <Sun className="text-amber-500" size={20} />,
      state: lighting,
      setState: setLighting,
      color: "amber",
      desc: "แสงในภาพเป็นแบบไหน? บรรยากาศให้อารมณ์แบบใด?",
      example: "cinematic lighting, dramatic shadows, volumetric neon fog, moody atmosphere"
    },
    {
      id: "camera",
      title: "4. Camera/Angle (มุมกล้องและเลนส์)",
      icon: <Camera className="text-rose-500" size={20} />,
      state: camera,
      setState: setCamera,
      color: "rose",
      desc: "อยากให้ภาพออกมาเหมือนถ่ายด้วยกล้องอะไร มุมมองไหน? (อารมณ์คล้ายการกำกับภาพ)",
      example: "low angle shot, 35mm lens, sharp focus, shallow depth of field, f/1.8"
    },
    {
      id: "style",
      title: "5. Style/Medium (สไตล์ศิลปะ)",
      icon: <Palette className="text-purple-500" size={20} />,
      state: style,
      setState: setStyle,
      color: "purple",
      desc: "ต้องการภาพแนวไหน? รูปถ่ายของจริง, อนิเมชั่น 3D, หรือภาพวาดสีน้ำลายเส้นศิลปิน?",
      example: "hyper-realistic photography, 8k resolution, Unreal Engine 5 render, award winning photo"
    },
    {
      id: "parameters",
      title: "6. Parameters (คำสั่งตั้งค่าโปรแกรม)",
      icon: <Sliders className="text-slate-500" size={20} />,
      state: parameters,
      setState: setParameters,
      color: "slate",
      desc: "การตั้งค่าพิเศษสำหรับ Midjourney เช่น สัดส่วนภาพ (Aspect Ratio) หรือเวอร์ชั่นตัวประมวลผล",
      example: "--ar 16:9 --v 6.0 --stylize 250"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Sparkles className="text-amber-400" size={20} />
              <span>Image AI Prompt Builder (Midjourney)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <h1 className="text-2xl font-black text-slate-800 mb-2">โค้ดลับเสกรูปภาพ (Image Prompt Formula)</h1>
            <p className="text-slate-500 text-sm mb-6">สร้างประโยคอธิบายภาพระดับ Masterpiece สำหรับ <strong>Midjourney / DALL-E / Google Flow</strong> ด้วยสูตรโครงสร้างภาพถ่าย 6 เลเยอร์</p>
            
            <div className="space-y-8">
              {sections.map((sec, idx) => (
                <div key={idx} className="relative group">
                  <div className="flex items-center gap-2 mb-2">
                    {sec.icon}
                    <label className={`font-bold text-slate-800 text-sm uppercase tracking-wide`}>{sec.title}</label>
                  </div>
                  
                  {/* Tooltip / Helper Hint */}
                  <div className={`mb-3 bg-${sec.color}-50 border border-${sec.color}-100 rounded-lg p-3 text-sm`}>
                    <div className={`font-bold text-${sec.color}-800 mb-1 flex items-center gap-1.5`}>
                      <Info size={14} /> คืออะไร?
                    </div>
                    <p className={`text-${sec.color}-700/80 mb-2`}>{sec.desc}</p>
                    <div className="bg-white/60 p-2 rounded text-xs font-mono text-slate-600">
                      <strong>ตัวอย่าง:</strong> {sec.example}
                    </div>
                  </div>

                  <textarea
                    rows={idx === 5 ? 1 : 2}
                    value={sec.state}
                    onChange={(e) => sec.setState(e.target.value)}
                    placeholder={`[พิมพ์ ${sec.title.split(' ')[1]} ที่นี่...]`}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium resize-y"
                  />
                </div>
              ))}
            </div>
            
            {/* Clear All Button */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
               <button 
                 onClick={() => {
                   setSubject(""); setSetting(""); setLighting(""); setCamera(""); setStyle(""); setParameters("");
                 }}
                 className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
               >
                 Clear All Fields
               </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Output */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-24 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                 <span className="ml-2 font-mono text-xs text-slate-400 font-bold uppercase tracking-widest">Midjourney Command</span>
               </div>
               <button 
                  onClick={handleCopy}
                  disabled={mainPromptParts.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mainPromptParts.length === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'}`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "COPIED!" : "COPY PROMPT"}
                </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {mainPromptParts.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-4">
                   <ImageIcon size={48} className="opacity-20" />
                   <p className="text-sm font-medium">ภาพจิตรกรรมกำลังรอการรังสรรค์<br/>กรอกรายละเอียดด้านซ้ายเพื่อผสม Prompt</p>
                 </div>
              ) : (
                <div className="font-mono text-sm leading-relaxed outline-none" contentEditable suppressContentEditableWarning>
                  <span className="text-emerald-400 font-bold">/imagine prompt:</span>{' '}
                  <span className="text-white">{mainPromptParts}</span>
                  {parameters && <span className="text-amber-400 font-bold"> {parameters}</span>}
                </div>
              )}
            </div>
            
            {mainPromptParts.length > 0 && (
              <div className="bg-slate-800/50 p-4 border-t border-slate-800 shrink-0">
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Info size={14} className="text-blue-400 shrink-0" />
                  <span>ก๊อปปี้โค้ดด้านบนแล้วนำไปวางใน <strong>Discord (Midjourney)</strong> ได้ทันที หรือลบ /imagine ออกเพื่อใช้กับ AI ตัวอื่น</span>
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
