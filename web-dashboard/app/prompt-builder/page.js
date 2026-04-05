"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Copy, Check, Info, Bot, Target, FileJson, Layers, Lightbulb, ShieldAlert } from "lucide-react";

export default function PromptBuilderPage() {
  const [role, setRole] = useState("");
  const [task, setTask] = useState("");
  const [format, setFormat] = useState("");
  const [context, setContext] = useState("");
  const [example, setExample] = useState("");
  const [constraint, setConstraint] = useState("");
  const [copied, setCopied] = useState(false);

  const finalPrompt = [
    role && `[ROLE]\n${role}\n`,
    task && `[TASK]\n${task}\n`,
    format && `[FORMAT]\n${format}\n`,
    context && `[CONTEXT]\n${context}\n`,
    example && `[EXAMPLE]\n${example}\n`,
    constraint && `[CONSTRAINT]\n${constraint}`
  ].filter(Boolean).join("\n").trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      id: "role",
      title: "1. Role (บทบาท)",
      icon: <Bot className="text-blue-500" size={20} />,
      state: role,
      setState: setRole,
      color: "blue",
      desc: "ต้องการให้ AI สวมบทบาทเป็นใคร มีความเชี่ยวชาญระดับไหน",
      example: "Act as a Senior Conversion Copywriter with 10 years of experience in the Health & Wellness industry."
    },
    {
      id: "task",
      title: "2. Task (งานที่ต้องทำ)",
      icon: <Target className="text-red-500" size={20} />,
      state: task,
      setState: setTask,
      color: "red",
      desc: "คำสั่งหลักที่ต้องการให้ทำ ระบุให้ชัดเจนที่สุด",
      example: "Write a high-converting Facebook Ad highlighting the dangers of afternoon brain fog."
    },
    {
      id: "format",
      title: "3. Format (รูปแบบผลลัพธ์)",
      icon: <FileJson className="text-emerald-500" size={20} />,
      state: format,
      setState: setFormat,
      color: "emerald",
      desc: "อยากให้ออกมาเป็นตาราง, Bullet points, บทความ, หรือ JSON",
      example: "Output the result strictly formatted clearly with bold headers and bullet points. Include emojis."
    },
    {
      id: "context",
      title: "4. Context (บริบท/ข้อมูลสนับสนุน)",
      icon: <Layers className="text-purple-500" size={20} />,
      state: context,
      setState: setContext,
      color: "purple",
      desc: "กลุ่มเป้าหมายคือใคร? ปัญหาของพวกเขาคืออะไร? เพื่อให้เนื้อหาตรงจุด",
      example: "The target audience is overworked male executives aged 40+ who drink 3 cups of coffee a day but still feel exhausted."
    },
    {
      id: "example",
      title: "5. Example (ตัวอย่างอ้างอิง)",
      icon: <Lightbulb className="text-amber-500" size={20} />,
      state: example,
      setState: setExample,
      color: "amber",
      desc: "ใส่ตัวอย่างของผลลัพธ์ที่คุณชอบ เพื่อให้ AI ลอกเลียนแบบสไตล์",
      example: "Tone example: 'Stop fighting the exhaustion. Your cells are screaming for help. Reboot your biology today.'"
    },
    {
      id: "constraint",
      title: "6. Constraint (ข้อจำกัด/ข้อห้าม)",
      icon: <ShieldAlert className="text-rose-600" size={20} />,
      state: constraint,
      setState: setConstraint,
      color: "rose",
      desc: "กฎเหล็ก ห้ามทำอะไร หรือจำกัดความยาวเท่าไหร่",
      example: "CRITICAL: Do NOT use medical jargon. Do NOT make medical claims. Length must be under 150 words total."
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
              <span>Ultimate Prompt Builder</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <h1 className="text-2xl font-black text-slate-800 mb-2">สูตรลับ 6 เสาหลัก (Prompt Formula)</h1>
            <p className="text-slate-500 text-sm mb-6">สร้างโครงสร้างสมอง AI ที่สมบูรณ์แบบด้วยกฏ Role + Task + Format + Context + Example + Constraint เพื่อให้ได้ผลลัพธ์ที่ดิ้นไม่หลุด</p>
            
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
                    rows={3}
                    value={sec.state}
                    onChange={(e) => sec.setState(e.target.value)}
                    placeholder={`[พิมพ์ ${sec.title.split(' ')[1]} ของคุณที่นี่...]`}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium resize-y"
                  />
                </div>
              ))}
            </div>
            
            {/* Clear All Button */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
               <button 
                 onClick={() => {
                   setRole(""); setTask(""); setFormat(""); setContext(""); setExample(""); setConstraint("");
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
                 <span className="ml-2 font-mono text-xs text-slate-400 font-bold uppercase tracking-widest">Final Prompt Output</span>
               </div>
               <button 
                  onClick={handleCopy}
                  disabled={!finalPrompt}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!finalPrompt ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'}`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "COPIED!" : "COPY PROMPT"}
                </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {!finalPrompt ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-4">
                   <Target size={48} className="opacity-20" />
                   <p className="text-sm font-medium">เริ่มกรอกข้อมูลทางด้านซ้าย<br/>ตัวจัดการคำสั่ง Prompt จะปรากฏที่นี่</p>
                 </div>
              ) : (
                <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed outline-none" contentEditable suppressContentEditableWarning>
                  {finalPrompt}
                </pre>
              )}
            </div>
            
            {finalPrompt && (
              <div className="bg-slate-800/50 p-4 border-t border-slate-800 shrink-0">
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Info size={14} className="text-blue-400" />
                  เคล็ดลับ: คุณสามารถคลิกในกรอบดำเพื่อแก้ไขข้อความให้เนียนขึ้นก่อนกด Copy ได้ทันที
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
