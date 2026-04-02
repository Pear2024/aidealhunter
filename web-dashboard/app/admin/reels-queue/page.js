'use client';
import { useState, useEffect } from 'react';

export default function ReelsQueueDashboard() {
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ pending: 0, posted: 0, failed: 0 });
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/reels/queue');
            if (res.ok) {
                const data = await res.json();
                setQueue(data.queue || []);
                setStats(data.stats || { pending: 0, posted: 0, failed: 0 });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this queued topic?")) return;
        try {
            const res = await fetch(`/api/reels/queue?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchQueue();
            else alert("Failed to delete");
        } catch(e) { console.error(e); }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const getNextRunTime = () => {
        const now = new Date();
        const runTimesUTC = [
            { h: 0, m: 7 }, { h: 4, m: 17 }, { h: 8, m: 27 }, 
            { h: 12, m: 37 }, { h: 16, m: 47 }, { h: 20, m: 57 }
        ];
        
        let nextRun = null;
        for (const time of runTimesUTC) {
            const candidate = new Date();
            candidate.setUTCHours(time.h, time.m, 0, 0);
            if (candidate > now) {
                nextRun = candidate;
                break;
            }
        }
        
        // If all times for today have passed, pick the first time tomorrow
        if (!nextRun) {
            nextRun = new Date();
            nextRun.setUTCDate(nextRun.getUTCDate() + 1);
            nextRun.setUTCHours(runTimesUTC[0].h, runTimesUTC[0].m, 0, 0);
        }
        return nextRun;
    };

    const nextRunTime = getNextRunTime();

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
            <h1 className="text-3xl font-bold mb-8 text-blue-600 dark:text-blue-400">📅 Medical Reels Content Queue</h1>
            
            <p className="mb-6 text-sm opacity-80 bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                The AI engine automatically fetches fresh news and inserts them here when the queue runs dry. 
                Topics marked as <span className="font-bold text-yellow-500">pending</span> will be posted automatically 
                according to your GitHub Actions schedule.
            </p>

            <div className="mb-8 p-5 bg-gradient-to-r from-purple-600 to-indigo-800 rounded-xl shadow-lg border border-purple-500 flex flex-col sm:flex-row items-center justify-between text-white">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <div className="text-4xl">⏱️</div>
                    <div>
                        <h2 className="text-lg font-bold">Next Automated Post Pipeline</h2>
                        <p className="opacity-90 text-sm">The script will autonomously wake up and process the top pending news at this exact time.</p>
                    </div>
                </div>
                <div className="text-right bg-white/20 px-6 py-3 rounded-lg border border-white/30 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-widest font-bold opacity-80">Scheduled For (Local Time)</p>
                    <p className="text-2xl font-black tabular-nums">{nextRunTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>

            <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg border border-blue-500 flex flex-col md:flex-row items-center justify-between text-white">
                <div className="mb-4 md:mb-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">🚀 Need a post immediately?</h2>
                    <p className="opacity-90 text-sm mt-1">Bypass the schedule and force the engine to generate and publish the next pending topic to Facebook right now.</p>
                </div>
                <button 
                    onClick={async (e) => {
                        e.target.disabled = true;
                        const originalText = e.target.innerText;
                        e.target.innerText = "⏳ Booting Servers...";
                        try {
                            const res = await fetch('/api/reels/trigger', { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) alert("✅ " + data.message);
                            else alert("❌ Error: " + data.error);
                        } catch(err) {
                            alert("Something went wrong!");
                        }
                        e.target.innerText = originalText;
                        e.target.disabled = false;
                    }}
                    className="whitespace-nowrap px-6 py-3 bg-white text-blue-700 font-bold rounded-lg shadow hover:bg-gray-50 transition transform hover:scale-105"
                >
                    ⚡️ Force Post Now
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
                <div className="bg-yellow-50 dark:bg-yellow-900/40 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800 shadow-sm">
                    <p className="text-4xl font-black text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 uppercase mt-2">📥 Found & Pending News</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/40 p-6 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                    <p className="text-4xl font-black text-green-600 dark:text-green-400">{stats.posted}</p>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase mt-2">✅ Successully Posted</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/40 p-6 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                    <p className="text-4xl font-black text-red-600 dark:text-red-400">{stats.failed}</p>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase mt-2">❌ Upload Failed (Errors)</p>
                </div>
            </div>

            {loading ? <p className="animate-pulse">Loading database queue...</p> : (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Topic / News Title</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Queued At</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {queue.map(item => (
                                <tr key={item.id} className={item.status === 'pending' ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50 opacity-60'}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {item.status === 'pending' ? (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">⏳ Pending Loop</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">✅ Posted</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 max-w-lg truncate" title={item.topic}>
                                        <div className="font-medium">{item.topic}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(item.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {item.status === 'pending' && (
                                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 border border-red-500 hover:bg-red-50 px-3 py-1 rounded transition-colors text-xs">
                                                🗑️ Remove Topic
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {queue.length === 0 && (
                                <tr><td colSpan="4" className="text-center py-8 text-gray-500">The queue is completely empty right now. The AI will repopulate it automatically on the next run!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
