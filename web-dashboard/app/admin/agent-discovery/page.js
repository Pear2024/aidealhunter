'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function AgentDiscoveryDashboard() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('laptop');

  const runDiscoveryAgent = async () => {
    setLoading(true);
    setError(null);
    setOutput('');
    
    try {
      const res = await fetch(`/api/cron/agent-discovery?key=super_secret_ai_cron_password_123&keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      
      if (res.ok) {
        setOutput(data.agent_final_response || "Success! But no message block was returned.");
      } else {
        setError(data.error || "Unknown error occurred.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dashboard" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <header className="header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', letterSpacing: '-1px' }}>🕵️ Discovery Agent</h1>
        <p className="subtitle" style={{ color: '#aaa', fontSize: '1.2rem' }}>Autonomous Deal Scraper & Merchandiser</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>
          <Link href="/admin/agents" style={{ color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid var(--accent)' }}>← Back to All Agents</Link>
        </div>
      </header>

      <section style={{ background: '#1a1a2e', padding: '2.5rem', borderRadius: '16px', border: '1px solid #2a2a4a', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🤖 Squad 1: Deal Hunter
            </h2>
            <p style={{ color: '#888', maxWidth: '500px', lineHeight: '1.5' }}>
              Replaces Agent 0, 1, and 4. Uses LangChain to search SlickDeals RSS, scrape raw Amazon/Walmart links via Cheerio, extract prices natively, and push directly to the Pending Approval Database.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <input 
               type="text" 
               value={keyword} 
               onChange={(e) => setKeyword(e.target.value)} 
               placeholder="target keyword..."
               style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#111', color: 'white' }}
             />
             <button 
               onClick={runDiscoveryAgent}
               disabled={loading}
               style={{ 
                 background: loading ? '#444' : 'linear-gradient(135deg, #FFD194 0%, #70E1F5 100%)', 
                 color: loading ? '#888' : '#111', 
                 border: 'none', 
                 padding: '14px 28px', 
                 borderRadius: '10px', 
                 fontWeight: '900', 
                 cursor: loading ? 'wait' : 'pointer',
                 fontSize: '1.1rem',
                 transition: 'all 0.3s',
                 boxShadow: loading ? 'none' : '0 4px 15px rgba(112, 225, 245, 0.4)',
                 transform: loading ? 'scale(0.98)' : 'scale(1)'
               }}
             >
               {loading ? '🕵️ Agent Hunting...' : '🚀 DISPATCH AGENT'}
             </button>
          </div>
        </div>

        {/* Terminal Window */}
        <div style={{ 
          background: '#0a0a14', 
          padding: '2rem', 
          borderRadius: '12px', 
          border: '1px solid #333',
          borderTop: '3px solid #70E1F5',
          minHeight: '300px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          whiteSpace: 'pre-wrap',
          color: '#00ffcc',
          overflowY: 'auto',
          fontSize: '0.95rem',
          lineHeight: '1.6'
        }}>
          {loading && (
             <div style={{ color: '#888', display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                 <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', borderColor: '#70E1F5 transparent transparent transparent' }}></div>
                 <span style={{ color: '#70E1F5' }}>Booting LangGraph React Agent...</span>
               </div>
               <span>{'>'} Mounting Discovery Tools (Search RSS, Scrape HTML, Database)... [OK]</span>
               <span>{'>'} Injecting Gemini 2.5 Flash LLM... [OK]</span>
               <span>{'>'} Handing over execution to Autonomous Discovery Agent... [PENDING]</span>
               <span style={{ color: '#555', marginTop: '10px', fontStyle: 'italic' }}>(Please wait 10 - 20 seconds for the Agent to complete its mission)</span>
             </div>
          )}
          
          {!loading && !output && !error && (
            <span style={{ color: '#444' }}>Awaiting command. Terminal ready.</span>
          )}
          
          {error && (
            <div style={{ color: '#ff4c4c' }}>
               <span style={{ fontWeight: 'bold' }}>[MISSION FAILED]:</span> {error}
            </div>
          )}
          
          {output && (
            <div className="fade-in">
              <span style={{ color: '#fff', fontWeight: 'bold' }}>[MISSION ACCOMPLISHED] Output from Agent:</span>
              <br /><br />
              {output}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
