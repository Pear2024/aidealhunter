"use client";
import React from 'react';

export default function CellularGuide() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #0a0f1f;
          color: #e2e8f0;
          -webkit-font-smoothing: antialiased;
        }

        .guide-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* HERO */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 20px;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url('/guide-cover-bg.png') center/cover;
          opacity: 0.35;
          z-index: 0;
        }
        .hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(10,15,31,0.3) 0%, rgba(10,15,31,0.95) 100%);
          z-index: 1;
        }
        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 650px;
        }
        .hero-badge {
          display: inline-block;
          background: linear-gradient(135deg, rgba(20,184,166,0.2), rgba(6,182,212,0.2));
          border: 1px solid rgba(20,184,166,0.4);
          color: #5eead4;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 8px 20px;
          border-radius: 100px;
          margin-bottom: 32px;
        }
        .hero h1 {
          font-size: clamp(32px, 6vw, 56px);
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -1.5px;
          margin-bottom: 24px;
        }
        .hero h1 .gradient-text {
          background: linear-gradient(135deg, #5eead4, #22d3ee, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
          font-size: 18px;
          color: #94a3b8;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .hero-author {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 14px;
          color: #64748b;
        }
        .hero-author .dot {
          width: 4px; height: 4px; border-radius: 50%; background: #334155;
        }

        /* SECTIONS */
        .section {
          padding: 80px 20px;
        }
        .section-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px; height: 48px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(20,184,166,0.15), rgba(99,102,241,0.15));
          border: 1px solid rgba(20,184,166,0.3);
          color: #5eead4;
          font-weight: 800;
          font-size: 20px;
          margin-bottom: 20px;
        }
        .section h2 {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
          line-height: 1.2;
        }
        .section h2 .highlight {
          color: #5eead4;
        }
        .section-intro {
          font-size: 17px;
          color: #94a3b8;
          line-height: 1.8;
          margin-bottom: 32px;
          max-width: 680px;
        }

        /* SIGN CARD */
        .sign-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9));
          border: 1px solid rgba(51,65,85,0.5);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }
        .sign-card:hover {
          border-color: rgba(20,184,166,0.4);
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .sign-card .sign-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }
        .sign-card .sign-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .sign-card h3 {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
        }
        .sign-card .sign-body {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.8;
        }
        .sign-card .science-note {
          margin-top: 16px;
          padding: 16px;
          background: rgba(20,184,166,0.08);
          border-left: 3px solid #14b8a6;
          border-radius: 0 12px 12px 0;
          font-size: 13px;
          color: #5eead4;
          line-height: 1.6;
        }
        .sign-card .science-note strong {
          color: #2dd4bf;
        }

        /* WHAT YOU CAN DO */
        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        .action-item {
          background: rgba(30,41,59,0.6);
          border: 1px solid rgba(51,65,85,0.4);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
        }
        .action-item .action-emoji {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .action-item h4 {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .action-item p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }

        /* CTA */
        .cta-section {
          text-align: center;
          padding: 80px 20px;
        }
        .cta-box {
          background: linear-gradient(135deg, rgba(20,184,166,0.1), rgba(99,102,241,0.1));
          border: 1px solid rgba(20,184,166,0.3);
          border-radius: 24px;
          padding: 48px 32px;
        }
        .cta-box h2 {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 800;
          margin-bottom: 16px;
        }
        .cta-box p {
          color: #94a3b8;
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 32px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #14b8a6, #0891b2);
          color: #fff;
          font-weight: 700;
          font-size: 17px;
          padding: 18px 40px;
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 8px 30px rgba(20,184,166,0.3);
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(20,184,166,0.4);
        }

        /* DISCLAIMER */
        .disclaimer {
          text-align: center;
          padding: 40px 20px 60px;
          font-size: 12px;
          color: #475569;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }

        /* DIVIDER */
        .divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #14b8a6, #6366f1);
          border-radius: 10px;
          margin: 0 auto 40px;
        }

        @media print {
          .hero { min-height: auto; page-break-after: always; }
          .section { page-break-inside: avoid; }
          body { background: #fff; color: #1e293b; }
          .sign-card { border: 1px solid #e2e8f0; }
        }
      `}</style>

      {/* HERO COVER */}
      <div className="hero">
        <div className="hero-content">
          <div className="hero-badge">Free Wellness Guide</div>
          <h1>
            5 Hidden Signs<br/>
            Your Cells Are <span className="gradient-text">Aging Faster</span><br/>
            Than You Think
          </h1>
          <p className="hero-subtitle">
            The subtle warning signs your body sends before things get serious — 
            and what cutting-edge science says you can do about it.
          </p>
          <div className="hero-author">
            <span>By Nadania Digital Health</span>
            <span className="dot"></span>
            <span>5 min read</span>
            <span className="dot"></span>
            <span>2026 Edition</span>
          </div>
        </div>
      </div>

      <div className="guide-container">

        {/* INTRO */}
        <div className="section">
          <div className="divider"></div>
          <p className="section-intro" style={{textAlign:'center', margin:'0 auto 20px'}}>
            Most people don't realize their cells are under stress until it's already affecting 
            their energy, skin, mood, and immune system. This guide reveals 5 science-backed 
            warning signs that your body's cellular machinery may need attention — before 
            small symptoms become big problems.
          </p>
        </div>

        {/* SIGN 1 */}
        <div className="section">
          <div className="section-number">1</div>
          <h2>The <span className="highlight">"Afternoon Crash"</span> That Coffee Can't Fix</h2>
          <p className="section-intro">
            You slept 7+ hours. You had your coffee. But by 2 PM, your brain feels like it's 
            running through mud. Sound familiar?
          </p>
          <div className="sign-card">
            <div className="sign-header">
              <div className="sign-icon" style={{background:'rgba(239,68,68,0.15)'}}>🔋</div>
              <h3>This isn't just "being tired" — it's a mitochondrial red flag</h3>
            </div>
            <div className="sign-body">
              Your mitochondria are the tiny power plants inside every cell. When they start 
              underperforming, your cells literally can't produce enough energy (ATP) to keep you going. 
              No amount of caffeine fixes a power plant that's breaking down.
              <div className="science-note">
                <strong>📊 The Science:</strong> A 2024 study in <em>Nature Aging</em> found that 
                mitochondrial dysfunction is one of the primary hallmarks of cellular aging, directly 
                linked to chronic fatigue, brain fog, and reduced exercise tolerance.
              </div>
            </div>
          </div>
        </div>

        {/* SIGN 2 */}
        <div className="section">
          <div className="section-number">2</div>
          <h2>Skin That <span className="highlight">Looks Dull</span> Despite Good Skincare</h2>
          <p className="section-intro">
            You've invested in serums, moisturizers, and SPF. But your skin still looks tired, 
            uneven, or older than your actual age.
          </p>
          <div className="sign-card">
            <div className="sign-header">
              <div className="sign-icon" style={{background:'rgba(168,85,247,0.15)'}}>✨</div>
              <h3>Topical products can't reach the cellular damage underneath</h3>
            </div>
            <div className="sign-body">
              When your cells can't efficiently repair DNA damage or clear out damaged proteins 
              (a process called autophagy), the effects show on your skin first. Collagen 
              production slows. Inflammation increases. No cream can fix what's broken 
              inside the cell.
              <div className="science-note">
                <strong>📊 The Science:</strong> Research published in <em>Cell Reports</em> shows 
                that cellular senescence — when cells stop dividing but refuse to die — directly 
                causes visible skin aging, including wrinkles, loss of elasticity, and uneven tone.
              </div>
            </div>
          </div>
        </div>

        {/* SIGN 3 */}
        <div className="section">
          <div className="section-number">3</div>
          <h2>Getting Sick <span className="highlight">More Often</span> Than You Used To</h2>
          <p className="section-intro">
            Every cold going around catches you. Recovery takes longer. Allergies seem worse every year.
          </p>
          <div className="sign-card">
            <div className="sign-header">
              <div className="sign-icon" style={{background:'rgba(234,179,8,0.15)'}}>🛡️</div>
              <h3>Your immune cells may be running on outdated software</h3>
            </div>
            <div className="sign-body">
              Your immune system depends on rapidly dividing cells that need peak cellular nutrition. 
              When nutrient sensing pathways (like mTOR and AMPK) fall out of balance, your immune 
              cells become sluggish, less accurate, and slower to respond.
              <div className="science-note">
                <strong>📊 The Science:</strong> A landmark <em>Nature</em> paper (2025) found that 
                nutrient-sensing alterations directly distort how intestinal stem cells differentiate — 
                weakening the body's first line of immune defense in the gut.
              </div>
            </div>
          </div>
        </div>

        {/* SIGN 4 */}
        <div className="section">
          <div className="section-number">4</div>
          <h2>Joints That <span className="highlight">Ache for No Reason</span></h2>
          <p className="section-intro">
            You haven't been injured. You're not overtraining. But your knees, back, or shoulders 
            feel stiff and inflamed.
          </p>
          <div className="sign-card">
            <div className="sign-header">
              <div className="sign-icon" style={{background:'rgba(251,146,60,0.15)'}}>🦴</div>
              <h3>Silent inflammation starts at the cellular level</h3>
            </div>
            <div className="sign-body">
              Aging cells release pro-inflammatory molecules (called SASP — the senescence-associated 
              secretory phenotype). This creates a slow-burning fire of chronic inflammation throughout 
              your body, especially in joints and connective tissue — long before any scan shows 
              "damage."
              <div className="science-note">
                <strong>📊 The Science:</strong> Studies on cellular inflammation show that compounds 
                like Urolithin A (the molecule Nestlé is now investing in) can help clear damaged 
                mitochondria and reduce this silent inflammatory cascade.
              </div>
            </div>
          </div>
        </div>

        {/* SIGN 5 */}
        <div className="section">
          <div className="section-number">5</div>
          <h2>Feeling <span className="highlight">"Old" in Your 30s-40s</span></h2>
          <p className="section-intro">
            A general sense that your body just doesn't bounce back like it used to. Slower recovery. 
            Lower motivation. Brain fog that won't lift.
          </p>
          <div className="sign-card">
            <div className="sign-header">
              <div className="sign-icon" style={{background:'rgba(59,130,246,0.15)'}}>🧬</div>
              <h3>Your biological age may be outpacing your calendar age</h3>
            </div>
            <div className="sign-body">
              Thanks to stress, environmental toxins, poor sleep, and processed food, many people 
              in their 30s have the cellular health of someone decades older. The gap between your 
              chronological age and your biological (cellular) age is what determines how you <em>feel</em>.
              <div className="science-note">
                <strong>📊 The Science:</strong> Epigenetic clocks developed by researchers like 
                Dr. Steve Horvath can now measure biological age at the molecular level. Studies 
                consistently show that lifestyle, nutrition, and cellular-level interventions can 
                slow — and in some cases reverse — this biological clock.
              </div>
            </div>
          </div>
        </div>

        {/* WHAT YOU CAN DO */}
        <div className="section">
          <div className="divider"></div>
          <h2 style={{textAlign:'center'}}>What Can You Do <span className="highlight">Right Now?</span></h2>
          <p className="section-intro" style={{textAlign:'center', margin:'0 auto 32px'}}>
            The good news: cellular health is not fixed. Small, targeted changes can make a 
            measurable difference. Here are 4 pillars of cellular recovery:
          </p>
          <div className="action-grid">
            <div className="action-item">
              <div className="action-emoji">🥗</div>
              <h4>Cellular Nutrition</h4>
              <p>Focus on polyphenols, omega-3s, and compounds that support mitochondrial function</p>
            </div>
            <div className="action-item">
              <div className="action-emoji">🌙</div>
              <h4>Deep Sleep</h4>
              <p>Your cells repair DNA damage during deep sleep phases — prioritize 7-8 hours</p>
            </div>
            <div className="action-item">
              <div className="action-emoji">🏃</div>
              <h4>Movement</h4>
              <p>Exercise triggers autophagy — your body's cellular cleanup system</p>
            </div>
            <div className="action-item">
              <div className="action-emoji">🧪</div>
              <h4>Assessment</h4>
              <p>Use diagnostic tools to understand what your body actually needs</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="cta-section">
          <div className="cta-box">
            <h2>Ready to Check <span style={{color:'#5eead4'}}>Your</span> Cellular Health?</h2>
            <p>
              Take our free AI-powered health assessment. Describe your symptoms, and our 
              medical AI will generate a personalized wellness protocol for you in under 2 minutes.
            </p>
            <a href="/wellness" className="cta-button">
              🧬 Start Free AI Assessment →
            </a>
          </div>
        </div>

        {/* DISCLAIMER */}
        <div className="disclaimer">
          <strong>Medical Disclaimer:</strong> This guide is for educational and informational purposes only. 
          It does not constitute medical advice, diagnosis, or treatment. Always consult with a qualified 
          healthcare provider before making changes to your health regimen.
          <br/><br/>
          © 2026 Nadania Digital Health. All rights reserved.
        </div>
      </div>
    </>
  );
}
