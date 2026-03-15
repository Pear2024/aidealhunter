'use client';
import { useEffect, useState } from 'react';

const AGENTS = [
  { id: 'agent_0', name: 'Agent 0: Trend Analyst', icon: '📈', desc: 'Discovers new keyword trends' },
  { id: 'agent_1', name: 'Agent 1: Data Scraper', icon: '🕸️', desc: 'Extracts deal info from raw HTML/RSS' },
  { id: 'agent_2', name: 'Agent 2: Validator', icon: '🕵️', desc: 'QA checks scraped data accuracy' },
  { id: 'agent_3', name: 'Agent 3: Copywriter', icon: '✍️', desc: 'Generates FB captions & hooks' },
  { id: 'agent_4', name: 'Agent 4: Merchandiser', icon: '🏪', desc: 'Scores & ranks deals for display' },
  { id: 'agent_5', name: 'Agent 5: Rechecker', icon: '🔄', desc: 'Verifies active deal validity' },
  { id: 'agent_6', name: 'Agent 6: Gatekeeper', icon: '🛡️', desc: 'Auto-Approves high quality deals' },
  { id: 'agent_7', name: 'Agent 7: Compliance', icon: '⚖️', desc: 'Enforces FTC guidelines' },
  { id: 'agent_8', name: 'Agent 8: Comment Closer', icon: '💬', desc: 'Replies to FB comments' },
  { id: 'agent_9', name: 'Agent 9: Lead Magnet', icon: '🧲', desc: 'Captures and processes emails' },
  { id: 'agent_10', name: 'Agent 10: Taste Profiler', icon: '🧠', desc: 'Segments user click behaviors' },
  { id: 'agent_11', name: 'Agent 11: Profit Brain', icon: '💰', desc: 'Calculates affiliate commissions' }
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
      await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', agentId: agent.id, agentName: agent.name })
      });
      fetchLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setTriggering(prev => ({ ...prev, [agent.id]: false })), 2000);
    }
  };

  // Build a map of latest status per agent
  const agentStatusMap = {};
  logs.forEach(log => {
      if(!agentStatusMap[log.agent_id]) {
          agentStatusMap[log.agent_id] = log;
      }
  });

  if (loading && logs.length === 0) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading The Overlord Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="dashboard" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ background: '-webkit-linear-gradient(45deg, #FF9A9E, #FECFEF)', WebkitBackgroundClip: 'text' }}>🌌 AI Overlord Dashboard</h1>
        <p className="subtitle">Command Center & System Logs for All Active Autonomous Agents</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px' }}>
          <a href="/admin" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to Review Queue</a>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Column: Agent Registry */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>🤖 The AI Roster</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {AGENTS.map(agent => {
              const latestLog = agentStatusMap[agent.id];
              const isWorking = latestLog?.status === 'running';
              const isFailed = latestLog?.status === 'failed';
              
              return (
                <div key={agent.id} style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '2.5rem' }}>{agent.icon}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{agent.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                         <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isFailed ? '#ff3b30' : (isWorking ? '#34c759' : '#8e8e93'), boxShadow: isWorking ? '0 0 8px #34c759' : 'none' }}></span>
                         <span style={{ fontSize: '0.8rem', color: '#ccc', textTransform: 'uppercase' }}>{isWorking ? 'Processing' : (isFailed ? 'Error' : 'Idle')}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px', minHeight: '40px' }}>{agent.desc}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                     <span style={{ fontSize: '0.8rem', color: '#888' }}>Last Active: {latestLog ? new Date(latestLog.created_at).toLocaleTimeString() : 'Never'}</span>
                     <button 
                        onClick={() => handleTrigger(agent)}
                        disabled={triggering[agent.id] || isWorking}
                        style={{ padding: '6px 12px', background: triggering[agent.id] || isWorking ? '#444' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: triggering[agent.id] || isWorking ? 'not-allowed' : 'pointer' }}
                     >
                       {triggering[agent.id] ? 'Waking up...' : 'Wake & Run'}
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Global Activity Log Feed */}
        <section style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', height: '100%', minHeight: '800px' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>📜 System Activity Logs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '800px', overflowY: 'auto', paddingRight: '10px' }}>
             {logs.length === 0 ? (
                 <p style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>No recent activities found.</p>
             ) : logs.map(log => (
               <div key={log.id} style={{ display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#888', fontSize: '0.85rem', whiteSpace: 'nowrap', paddingTop: '3px' }}>
                     {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </div>
                  <div>
                     <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: log.status === 'failed' ? '#ff3b30' : (log.status==='running' ? '#ffcc00' : '#4cd964') }}>
                        [{log.agent_name}] {log.action}
                     </div>
                     <div style={{ color: '#ccc', fontSize: '0.85rem', marginTop: '4px' }}>
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
