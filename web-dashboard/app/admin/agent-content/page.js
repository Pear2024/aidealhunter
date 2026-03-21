'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function AgentContentDashboard() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);

  const runContentAgent = async () => {
    setLoading(true);
    setError(null);
    setOutput('');
    
    try {
      const res = await fetch(`/api/cron/agent-content?key=super_secret_ai_cron_password_123`);
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
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', letterSpacing: '-1px' }}>📝 Content Generation Agent</h1>
        <p className="subtitle" style={{ color: '#aaa', fontSize: '1.2rem' }}>Autonomous SEO Blogger & Facebook Marketer</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>
          <Link href="/admin/agents" style={{ color: '#ff3366', textDecoration: 'none', borderBottom: '1px solid #ff3366' }}>← Back to All Agents</Link>
        </div>
      </header>

      <section style={{ background: '#1a1a2e', padding: '2.5rem', borderRadius: '16px', border: '1px solid #2a2a4a', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🤖 Squad 3: Content Marketing
            </h2>
            <p style={{ color: '#888', maxWidth: '500px', lineHeight: '1.5' }}>
              Replaces Agent 3 and 13. This agent pulls an approved deal, writes an SEO blog post, drafts a Facebook post, and <strong>generates a stunning DALL-E 3 Lifestyle Image</strong>!
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <button 
               onClick={runContentAgent}
               disabled={loading}
               style={{ 
                 background: loading ? '#444' : 'linear-gradient(135deg, #ff3366 0%, #ff9933 100%)', 
                 color: loading ? '#888' : '#fff', 
                 border: 'none', 
                 padding: '14px 28px', 
                 borderRadius: '10px', 
                 fontWeight: '900', 
                 cursor: loading ? 'wait' : 'pointer',
                 fontSize: '1.1rem',
                 transition: 'all 0.3s',
                 boxShadow: loading ? 'none' : '0 4px 15px rgba(255, 51, 102, 0.4)',
                 transform: loading ? 'scale(0.98)' : 'scale(1)'
               }}
             >
               {loading ? '📝 Writing Content...' : '🔥 LAUNCH CAMPAIGN'}
             </button>
          </div>
        </div>

        {/* Terminal Window */}
        <div style={{ 
          background: '#0a0a14', 
          padding: '2rem', 
          borderRadius: '12px', 
          border: '1px solid #333',
          borderTop: '3px solid #ff3366',
          minHeight: '300px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          whiteSpace: 'pre-wrap',
          color: '#ff9933',
          overflowY: 'auto',
          fontSize: '0.95rem',
          lineHeight: '1.6'
        }}>
          {loading && (
             <div style={{ color: '#888', display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                 <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', borderColor: '#ff3366 transparent transparent transparent' }}></div>
                 <span style={{ color: '#ff3366' }}>Booting Content Marketing Brain...</span>
               </div>
               <span>{'>'} Connecting to Normalized Deals Database... [OK]</span>
               <span>{'>'} Loading Persuasive Copywriting Prompts... [OK]</span>
               <span>{'>'} Content Agent taking over task... [PENDING]</span>
               <span style={{ color: '#555', marginTop: '10px', fontStyle: 'italic' }}>(Please wait 10 - 20 seconds for the Agent to write and publish)</span>
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
