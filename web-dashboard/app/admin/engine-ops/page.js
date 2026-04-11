'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ServerCrash, CheckCircle2, Clapperboard, Activity, Clock, Server, ArrowLeft } from 'lucide-react';

export default function EngineOpsDashboard() {
  const [data, setData] = useState({ logs: [], metrics: {}, alerts: [], providers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/engine-ops')
      .then(res => res.json())
      .then(d => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="text-[#00FF66] animate-pulse">Establishing secure link to AI Engine...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <Link href="/admin" className="text-gray-400 hover:text-white flex items-center gap-2 mb-6 w-max">
        <ArrowLeft size={16} /> Back to Command Center
      </Link>
      
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00FF66] to-[#00A3FF] flex items-center gap-3">
          <Server size={32} />
          Engine Operations Monitor
        </h1>
        <p className="text-gray-400 mt-2">Live telemetry and health status of the Nadania Automation Pipeline</p>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-[#222] p-5 rounded-xl">
          <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Activity size={16}/> Runs Today</div>
          <div className="text-3xl font-bold">{data.metrics?.total_runs || 0}</div>
        </div>
        <div className="bg-[#111] border border-[#222] p-5 rounded-xl">
          <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Success Rate</div>
          <div className="text-3xl font-bold">{data.metrics?.total_runs ? Math.round((data.metrics.successful_runs / data.metrics.total_runs) * 100) : 0}%</div>
        </div>
        <div className="bg-[#111] border border-[#222] p-5 rounded-xl">
          <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><ServerCrash size={16} className="text-red-500"/> Failed Runs</div>
          <div className="text-3xl font-bold">{data.metrics?.failed_runs || 0}</div>
        </div>
        <div className="bg-[#111] border border-[#222] p-5 rounded-xl">
          <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Clapperboard size={16} className="text-blue-500"/> Primary Provider</div>
          <div className="text-xl font-bold truncate">{data.providers && data.providers.length > 0 ? data.providers[0].provider_used : 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Logs & Audit */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="bg-[#1A1A1A] px-5 py-4 border-b border-[#222]">
              <h2 className="font-bold flex items-center gap-2"><Activity size={18} className="text-blue-400" /> Recent Pipeline Executions</h2>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 bg-[#0A0A0A]">
                    <th className="px-5 py-3 font-medium">Run ID</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Topic Highlight</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {data.logs.map((log) => (
                    <tr key={log.run_id} className="hover:bg-[#151515] transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">{log.run_id.substring(0, 8)}...</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${log.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-300 max-w-xs truncate" title={log.selected_topic}>{log.selected_topic || 'N/A'}</td>
                      <td className="px-5 py-4 text-gray-500">{new Date(log.started_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {data.logs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-5 py-8 text-center text-gray-500">No recent runs detected.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Col: Alerts */}
        <div className="space-y-6">
          <section className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="bg-[#1A1A1A] px-5 py-4 border-b border-[#222]">
              <h2 className="font-bold flex items-center gap-2"><ShieldAlert size={18} className="text-orange-500" /> Active System Alerts</h2>
            </div>
            <div className="p-5 space-y-4">
              {data.alerts.map((alert) => (
                <div key={alert.alert_key} className="flex gap-4 items-start pb-4 border-b border-[#222] last:border-0 last:pb-0">
                  <div className="mt-1">
                    <ShieldAlert size={16} className={alert.resolved ? 'text-gray-600' : 'text-orange-500'} />
                  </div>
                  <div>
                    <div className={`font-mono text-sm ${alert.resolved ? 'text-gray-500 line-through' : 'text-orange-400'}`}>{alert.alert_key}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={12}/> {new Date(alert.last_alert_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {data.alerts.length === 0 && (
                <div className="text-center text-gray-500 py-6">All systems green. No active alerts.</div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
