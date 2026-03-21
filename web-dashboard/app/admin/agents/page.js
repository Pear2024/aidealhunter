'use client';
import { useEffect, useState } from 'react';

const AGENTS = [
  { id: 'agent_0', endpoint: '/api/cron/agent-trend', name: 'Squad 0: Trend Master', icon: '📡', desc: 'Reads Google Trends to autonomously pick a viral keyword and completely triggers the Deal Hunter automatically' },
  { id: 'agent_1', endpoint: '/api/cron/agent-discovery', name: 'Squad 1: Deal Hunter', icon: '🕵️', desc: 'Scours RSS feeds and Cheerio scrapes Slickdeals/Amazon for the best margin items. Auto-Approves' },
  { id: 'agent_3', endpoint: '/api/cron/agent-content', name: 'Squad 3: Content Marketing', icon: '✍️', desc: 'Pens SEO-compliant Blog Posts, composes FB Captions, and dynamically prompts DALL-E 3 for premium imagery' },
  { id: 'agent_4', endpoint: '/api/cron/agent-community', name: 'Squad 4: Community Admin', icon: '💬', desc: 'Monitors the FB page, writes charming replies to user comments, and actively posts organic poll/meme questions' }
];

export default function AgentsDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState({});

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if(data.logs) setLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (agent) => {
    setTriggering(prev => ({ ...prev, [agent.id]: true }));
    try {
      // Log manual trigger in DB so UI updates instantly
      await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', agentId: agent.id, agentName: agent.name })
      });
      
      // Fire the actual LangChain Agent in the background (fire and forget)
      fetch(`${agent.endpoint}?key=super_secret_ai_cron_password_123`).catch(console.error);

      fetchLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setTriggering(prev => ({ ...prev, [agent.id]: false })), 2000);
    }
  };

  const agentStatusMap = {};
  logs.forEach(log => {
      if(!agentStatusMap[log.agent_id]) {
          agentStatusMap[log.agent_id] = log;
      }
  });

  if (loading && logs.length === 0) {
    return (
      <div className="loader-container" style={{ textAlign: 'center', marginTop: '10%' }}>
        <p>Loading LangChain Agent Roster...</p>
      </div>
    );
  }

  return (
    <main className="dashboard" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ background: '-webkit-linear-gradient(45deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🌌 LangChain Autonomous Squads
        </h1>
        <p className="subtitle" style={{ color: '#aaa', fontSize: '1.2rem' }}>The fully modernized, AI-driven automation team</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px' }}>
          <a href="/admin" style={{ color: '#3b82f6', textDecoration: 'none' }}>← Back to Approvals Queue</a>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Column: Agent Registry */}
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {AGENTS.map(agent => {
              const latestLog = agentStatusMap[agent.id];
              const isWorking = latestLog?.status === 'running';
              const isFailed = latestLog?.status === 'failed';
              
              return (
                <div key={agent.id} style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '2.5rem' }}>{agent.icon}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>{agent.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                         <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isWorking ? '#10b981' : (isFailed ? '#ef4444' : '#6b7280'), boxShadow: isWorking ? '0 0 8px #10b981' : 'none' }}></span>
                         <span style={{ fontSize: '0.8rem', color: '#ccc', textTransform: 'uppercase' }}>
                            {isWorking ? 'Processing' : (isFailed ? 'Error' : 'Standby')}
                         </span>
                      </div>
                    </div>
                  </div>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '15px', minHeight: '60px', lineHeight: '1.5' }}>{agent.desc}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                     <button 
                        onClick={() => handleTrigger(agent)}
                        disabled={triggering[agent.id] || isWorking}
                        style={{ padding: '8px 16px', background: triggering[agent.id] || isWorking ? '#4b5563' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: triggering[agent.id] || isWorking ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                     >
                       {triggering[agent.id] ? 'Dispatching...' : '▶ MANUAL DISPATCH'}
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Global Activity Log Feed */}
        <section style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', height: '100%', minHeight: '600px' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>📜 System Activity Logs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
             {logs.length === 0 ? (
                 <p style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>No recent activities found.</p>
             ) : logs.map(log => (
               <div key={log.id} style={{ display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #374151' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', whiteSpace: 'nowrap', paddingTop: '3px' }}>
                     {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </div>
                  <div>
                     <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: log.status === 'failed' ? '#ef4444' : (log.status==='running' ? '#f59e0b' : '#10b981') }}>
                        [{log.agent_name}] {log.action}
                     </div>
                     <div style={{ color: '#d1d5db', fontSize: '0.85rem', marginTop: '4px' }}>
                        {log.details}
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </section>

      </div>
    </main>
  );
}
