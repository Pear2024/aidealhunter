'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function AgentTrendDashboard() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const runAgent = async () => {
    setLoading(true);
    setError('');
    setOutput('');
    
    try {
      const res = await fetch(`/api/cron/agent-trend?key=super_secret_ai_cron_password_123`);
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
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#111827', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* HEADER AREA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
             <Link href="/admin" style={{ color: '#3b82f6', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
              &larr; Back to Admin
             </Link>
             <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📡 Squad 0: Trend Master (Autonomous)
             </h2>
             <p style={{ color: '#888', maxWidth: '600px', lineHeight: '1.5' }}>
                This overarching agent fetches real-time Google Hot Trends, filters out junk (sports/politics), selects one highly profitable e-commerce item, and <strong>instantly triggers Squad 1</strong> to hunt for that exact item without your intervention!
             </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <button 
                onClick={runAgent} 
                disabled={loading}
                style={{
                  padding: '12px 24px', 
                  backgroundColor: loading ? '#4b5563' : '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? '📡 SCANNING TRENDS & DISPATCHING...' : '📡 SCAN TRENDS & AUTO-DISPATCH'}
              </button>
          </div>
        </div>

        {/* OUTPUT CONSOLE */}
        <div style={{ 
            backgroundColor: '#1f2937', 
            border: `1px solid ${error ? '#ef4444' : '#374151'}`, 
            borderRadius: '12px',
            padding: '1.5rem',
            color: '#d1d5db',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            minHeight: '200px',
            overflowX: 'auto'
        }}>
           {error ? (
              <div style={{ color: '#ef4444' }}>[SYSTEM FAILURE] {error}</div>
           ) : output ? (
              <div className="fade-in">
                {output}
              </div>
           ) : (
              <div style={{ opacity: 0.5 }}>Awaiting command. Overarching system is ready.</div>
           )}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .fade-in { animation: fadeIn 0.5s ease-in; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}} />
      </div>
    </div>
  );
}
