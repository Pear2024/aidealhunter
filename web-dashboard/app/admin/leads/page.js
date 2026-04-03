'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LeadsReport() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/leads', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setLeads(data.leads || []);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar (Simple mock) */}
            <div className="w-64 bg-white border-r shadow-sm hidden md:block">
                <div className="p-6">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Nadania AI</h2>
                </div>
                <nav className="mt-6">
                    <Link href="/admin/reels-queue" className="block px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-blue-600 font-medium">Reels Queue</Link>
                    <Link href="/admin/leads" className="block px-6 py-3 text-blue-600 bg-blue-50 border-r-4 border-blue-600 font-medium">Patient Leads</Link>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 leading-tight">Patient Assessment Leads</h1>
                        <p className="text-gray-500 mt-1">Live report of users who completed the Nadania Wellness AI form.</p>
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-bold text-lg">
                        Total Leads: {leads.length}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                        <div className="text-5xl mb-4">📭</div>
                        <h3 className="text-xl font-bold text-gray-800">No leads captured yet</h3>
                        <p className="text-gray-500 mt-2">The table is currently empty because the tracking system was just installed.</p>
                        <p className="text-gray-500">Wait for the next wave of Facebook Reel viewers to submit the form!</p>
                    </div>
                ) : (
                    <div className="bg-white shadow-sm rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="p-4 font-semibold text-gray-700 text-sm">Timestamp</th>
                                        <th className="p-4 font-semibold text-gray-700 text-sm">Symptoms</th>
                                        <th className="p-4 font-semibold text-gray-700 text-sm">Duration & Lifestyle</th>
                                        <th className="p-4 font-semibold text-gray-700 text-sm">AI Recommendation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((lead) => (
                                        <tr key={lead.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-xs text-gray-500 whitespace-nowrap align-top">
                                                {new Date(lead.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-4 text-sm text-gray-800 align-top max-w-xs font-medium">
                                                {lead.symptoms}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 align-top max-w-xs">
                                                <div className="mb-2"><span className="font-semibold text-gray-800">Duration:</span> {lead.duration}</div>
                                                <div><span className="font-semibold text-gray-800">Lifestyle:</span> {lead.lifestyle}</div>
                                            </td>
                                            <td className="p-4 text-xs text-gray-600 align-top max-w-md">
                                                <div className="line-clamp-4 hover:line-clamp-none transition-all duration-300 relative bg-green-50 p-3 rounded border border-green-100" dangerouslySetInnerHTML={{ __html: lead.ai_diagnosis }}></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
