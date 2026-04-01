'use client';
import { useState, useEffect } from 'react';

export default function ReelsQueueDashboard() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/reels/queue');
            if (res.ok) setQueue(await res.json());
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

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
            <h1 className="text-3xl font-bold mb-8 text-blue-600 dark:text-blue-400">📅 Medical Reels Content Queue</h1>
            
            <p className="mb-6 text-sm opacity-80 bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                The AI engine automatically fetches fresh news and inserts them here when the queue runs dry. 
                Topics marked as <span className="font-bold text-yellow-500">pending</span> will be posted automatically 
                one by one every 4 hours according to your GitHub Actions schedule.
            </p>

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
