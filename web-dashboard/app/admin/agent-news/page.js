'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function AgentNewsDashboard() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);

  const runNewsAgent = async () => {
    setLoading(true);
    setError(null);
    setOutput('');
    
    try {
      // API requires cron secret to prevent unauthorized execution
      const res = await fetch('/api/cron/agent-news?key=super_secret_ai_cron_password_123');
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
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', letterSpacing: '-1px' }}>📰 AI News Agent</h1>
        <p className="subtitle" style={{ color: '#aaa', fontSize: '1.2rem' }}>Autonomous Global News Courier</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>
          <Link href="/admin/agents" style={{ color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid var(--accent)' }}>← Back to All Agents</Link>
        </div>
      </header>

      <section style={{ background: '#1a1a2e', padding: '2.5rem', borderRadius: '16px', border: '1px solid #2a2a4a', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🤖 LangChain React Agent
            </h2>
            <p style={{ color: '#888', maxWidth: '500px', lineHeight: '1.5' }}>
              Scours the web for the latest AI news via RSS, filters out duplicates in the database, translates and formats 3 top stories into Thai, and blasts them to Telegram autonomously.
            </p>
          </div>
          <button 
            onClick={runNewsAgent}
            disabled={loading}
            style={{ 
              background: loading ? '#444' : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', 
              color: loading ? '#888' : '#111', 
              border: 'none', 
              padding: '14px 28px', 
              borderRadius: '10px', 
              fontWeight: '900', 
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '1.1rem',
              transition: 'all 0.3s',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(56, 239, 125, 0.4)',
              transform: loading ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            {loading ? '💭 Agent is Thinking...' : '⚡ DISPATCH AGENT'}
          </button>
        </div>

        {/* Terminal Window */}
        <div style={{ 
          background: '#0a0a14', 
          padding: '2rem', 
          borderRadius: '12px', 
          border: '1px solid #333',
          borderTop: '3px solid #38ef7d',
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
                 <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', borderColor: '#38ef7d transparent transparent transparent' }}></div>
                 <span style={{ color: '#38ef7d' }}>Booting LangGraph React Agent...</span>
               </div>
               <span>{'>'} Mounting Core Tools (Search, DB, Telegram)... [OK]</span>
               <span>{'>'} Injecting Gemini 2.5 Flash LLM... [OK]</span>
               <span>{'>'} Handing over execution to Autonomous Agent... [PENDING]</span>
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
