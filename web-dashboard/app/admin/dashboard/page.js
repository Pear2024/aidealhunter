"use client";
import { useEffect, useState } from 'react';

export default function AICommandCenter() {
    const [summary, setSummary] = useState(null);
    const [intelligence, setIntelligence] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [sumRes, intelRes] = await Promise.all([
                    fetch('/api/admin/summary').then(r => r.json()),
                    fetch('/api/admin/intelligence').then(r => r.json())
                ]);
                setSummary(sumRes);
                setIntelligence(intelRes);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center font-mono text-emerald-400">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
        Booting AI Command Center...
    </div>;

    const memory = intelligence?.memory || {};

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-8">
            <header className="mb-12 flex justify-between items-end border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">
                        AI COMMAND CENTER
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Autonomous Marketing Engine - CEO View Active
                    </p>
                </div>
            </header>

            {/* TIER 1: EXECUTIVE SUMMARY */}
            <section className="mb-12">
                <h2 className="text-lg font-bold text-gray-300 uppercase tracking-wider mb-4 border-l-4 border-cyan-500 pl-3">Boardroom Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ExecutiveCard title="Published Today" value={summary?.posted_today} color="blue" />
                    <ExecutiveCard title="Winners Forged" value={summary?.total_winners} color="emerald" />
                    <ExecutiveCard title="Ready to Boost" value={summary?.should_boost} color="yellow" label="FIREPOWER" />
                    <ExecutiveCard title="Ads Active" value={summary?.ads_boosted} color="green" label="SPENDING" />
                </div>
            </section>

            {/* TIER 2: AI COMMAND INTELLIGENCE */}
            <section className="mb-12">
                <h2 className="text-lg font-bold text-gray-300 uppercase tracking-wider mb-4 border-l-4 border-yellow-500 pl-3">Performance Intelligence</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-black text-gray-400 uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-4 py-4" style={{minWidth: '220px'}}>หัวข้อ</th>
                                    <th className="px-4 py-4">Impressions</th>
                                    <th className="px-4 py-4">Comments</th>
                                    <th className="px-4 py-4">CMT Rate</th>
                                    <th className="px-4 py-4">Hold Rate</th>
                                    <th className="px-4 py-4">Rev Score</th>
                                    <th className="px-4 py-4 text-center">AI Decision</th>
                                    <th className="px-4 py-4" style={{minWidth: '180px'}}>กลุ่มเป้าหมาย Boost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 text-gray-300">
                                {intelligence?.performances?.map((post, i) => {
                                    const topicLabel = post.topic_name || post.hook || post.run_id || post.post_id;
                                    const pillar = post.content_pillar;
                                    const audienceMap = {
                                        'PAIN': '💊 คนมีปัญหาสุขภาพ 35-65 ปี',
                                        'EDUCATION': '📚 คนรักสุขภาพ 25-55 ปี',
                                        'MYTH': '🔬 คนชอบ fact-check 25-45 ปี',
                                        'TRANSFORMATION': '✨ คนอยากเปลี่ยนแปลง 30-55 ปี',
                                        'CTA': '🎯 คนพร้อมซื้อ 30-60 ปี'
                                    };
                                    const audience = pillar && audienceMap[pillar] 
                                        ? audienceMap[pillar]
                                        : post.decision === 'BOOST' ? '🎯 Health-conscious 25-55' : null;
                                    
                                    return (
                                    <tr key={i} className="hover:bg-gray-800/80 transition-colors group">
                                        <td className="px-4 py-4 max-w-[260px]">
                                            <a href={`https://www.facebook.com/${post.post_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
                                                <div className="text-sm font-medium text-gray-200 truncate">{topicLabel}</div>
                                                {post.content_pillar && (
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{post.content_pillar}</span>
                                                )}
                                            </a>
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-gray-200">
                                            {post.impressions ? parseInt(post.impressions).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-emerald-400 font-semibold">
                                            {post.comments != null ? parseInt(post.comments).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-cyan-400">
                                            {post.comment_rate ? (parseFloat(post.comment_rate) * 100).toFixed(2) + '%' : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-blue-400">
                                            {post.hold_rate ? (parseFloat(post.hold_rate) * 100).toFixed(2) + '%' : '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <MetricBadge score={post.revenue_score} />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <DecisionBadge decision={post.decision} />
                                        </td>
                                        <td className="px-4 py-4 text-xs">
                                            {audience ? (
                                                <span className={`${post.decision === 'BOOST' ? 'text-yellow-400 font-semibold' : 'text-gray-500'}`}>
                                                    {audience}
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                                {(!intelligence?.performances || intelligence.performances.length === 0) && (
                                    <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No published posts with metrics yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* TIER 3: LEARNING BRAIN */}
            <section className="mb-12">
                <h2 className="text-lg font-bold text-gray-300 uppercase tracking-wider mb-4 border-l-4 border-purple-500 pl-3">The Learning Brain</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">🔥 Top Winning Hooks</h3>
                        <ul className="list-disc pl-4 space-y-2 text-sm text-gray-300">
                            {memory.best_hook_styles?.map((s, i) => <li key={i}>{s}</li>)}
                            {!memory.best_hook_styles?.length && <p className="text-gray-600 italic">No data yet.</p>}
                        </ul>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">💬 High Intent CTAs</h3>
                        <ul className="list-disc pl-4 space-y-2 text-sm text-gray-300">
                            {memory.best_cta_styles?.map((s, i) => <li key={i}>{s}</li>)}
                            {!memory.best_cta_styles?.length && <p className="text-gray-600 italic">No data yet.</p>}
                        </ul>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">⚠️ Toxic Patterns</h3>
                        <ul className="list-disc pl-4 space-y-2 text-sm text-gray-300">
                            {memory.patterns_to_avoid?.map((s, i) => <li key={i}>{s}</li>)}
                            {!memory.patterns_to_avoid?.length && <p className="text-gray-600 italic">No data yet.</p>}
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ExecutiveCard({ title, value, color, label }) {
    const colorClasses = {
        emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        yellow: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
        blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
        green: 'border-green-500/30 bg-green-500/10 text-green-400'
    };
    return (
        <div className={`p-6 rounded-xl border ${colorClasses[color]} relative overflow-hidden group`}>
            {label && <span className="absolute top-0 right-0 bg-black/40 text-[9px] px-2 py-1 font-bold tracking-widest">{label}</span>}
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{title}</p>
            <p className="text-5xl font-black tracking-tight">{value !== undefined ? value : '-'}</p>
            <div className={`absolute bottom-0 left-0 w-full h-1 opacity-50 bg-current transition-all group-hover:h-2`}></div>
        </div>
    );
}

function MetricBadge({ score }) {
    if (!score) return <span className="text-gray-600">-</span>;
    const num = parseFloat(score);
    if (num >= 75) return <span className="px-2 py-1 rounded bg-emerald-900/40 text-emerald-400 text-xs font-black border border-emerald-500/50">{num}</span>;
    if (num >= 60) return <span className="px-2 py-1 rounded bg-blue-900/40 text-blue-400 text-xs font-bold border border-blue-500/30">{num}</span>;
    return <span className="px-2 py-1 rounded bg-red-900/40 text-red-500 text-xs font-semibold border border-red-900/50">{num}</span>;
}

function DecisionBadge({ decision }) {
    if (decision === 'BOOST') return <span className="px-2 py-1 rounded-full bg-yellow-500 text-black text-[10px] font-black tracking-wider uppercase shadow-[0_0_10px_rgba(234,179,8,0.5)]">BOOST</span>;
    if (decision === 'ORGANIC_ONLY') return <span className="px-2 py-1 rounded-full bg-blue-900/40 text-blue-400 text-[10px] font-bold tracking-wider uppercase border border-blue-800">ORGANIC</span>;
    if (decision === 'DO_NOT_BOOST') return <span className="px-2 py-1 rounded-full bg-red-900/20 text-red-500 text-[10px] font-bold tracking-wider uppercase border border-red-900">KILL</span>;
    return <span className="text-gray-600 text-xs uppercase">Observing</span>;
}
