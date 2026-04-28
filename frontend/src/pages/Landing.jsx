/* Landing page — Screen 0 — Premium redesign */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const SEV_DOT = { CRITICAL: '#f43f5e', HIGH: '#f59e0b', MEDIUM: '#60a5fa', LOW: '#6b7280' };

const FEATURES = [
  {
    icon: '◈',
    color: '#38bdf8',
    title: 'Real-Time Signal Extraction',
    body: 'GDELT scraping across 65 languages. NER detects factory_closure, export_ban, contamination events across China, India, and key supply corridors.',
  },
  {
    icon: '◉',
    color: '#a78bfa',
    title: 'Graph-Based Risk Propagation',
    body: 'Personalized PageRank on a live dependency graph of 20 pharma APIs + 8 rare earths. Louvain community detection surfaces correlated supply clusters.',
  },
  {
    icon: '◆',
    color: '#34d399',
    title: 'AI Action Intelligence',
    body: 'Gemini 2.5 Flash generates grounded procurement recommendations — supplier names, quantities, lead times — backed by NLEM, Comtrade, and SARS-2003 historical playbooks.',
  },
  {
    icon: '◇',
    color: '#f59e0b',
    title: 'Economic Impact Modeling',
    body: 'Real-time stockout and emergency procurement cost projections per drug. Risk-weighted market values surface the $M at stake before a crisis locks in.',
  },
];

const PROOF_STATS = [
  { val: '67', unit: 'days', lbl: 'Early COVID warning', color: '#f43f5e' },
  { val: '93%', unit: '', lbl: 'Shortage prediction match', color: '#34d399' },
  { val: '$2.4B', unit: '', lbl: 'Modeled exposure tracked', color: '#f59e0b' },
  { val: '28', unit: 'nodes', lbl: 'Supply graph inputs', color: '#a78bfa' },
];

function LiveShockTicker({ shocks }) {
  if (!shocks.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {shocks.slice(0, 4).map((s, i) => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${SEV_DOT[s.severity] || '#6b7280'}20`,
          borderLeft: `3px solid ${SEV_DOT[s.severity] || '#6b7280'}`,
          borderRadius: 8, padding: '12px 16px',
          animation: `slideUp 0.4s ${i * 0.08}s ease both`,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
            background: SEV_DOT[s.severity] || '#6b7280',
            boxShadow: `0 0 8px ${SEV_DOT[s.severity] || '#6b7280'}60`,
          }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.84rem', lineHeight: 1.45, color: '#e2e4ec', marginBottom: 3 }}>{s.title}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                {s.sector === 'rare_earth' ? 'RARE EARTHS' : 'PHARMA'}
              </span>
              {s.province && <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{s.province}</span>}
              <span style={{ fontSize: '0.65rem', color: SEV_DOT[s.severity], fontWeight: 700, fontFamily: 'var(--mono)' }}>{s.severity}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                {new Date(s.detected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Landing({ onGuest }) {
  const navigate = useNavigate();
  const { login, enterAsGuest } = useAuth();
  const [shocks, setShocks] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getShocks({ limit: 6 }),
      api.health().catch(() => null),
    ])
      .then(([s, hz]) => { setShocks(s || []); setHealth(hz); })
      .catch(() => setShocks([]))
      .finally(() => setLoading(false));
  }, []);

  const critCount = shocks.filter(s => s.severity === 'CRITICAL').length;
  const isDemoMode = health?.demo_mode === true;
  const isHybridFeed = health?.shock_feed_mode === 'hybrid_demo_live';
  const isDemoOnly = health?.shock_feed_mode === 'demo';
  const statusLabel = isHybridFeed
    ? 'Hybrid feed · live shocks + curated scenarios'
    : isDemoOnly
    ? 'Curated scenario mode active'
    : 'GDELT monitoring · updates every 15 min';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gridScroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
      `}</style>

      {/* Animated grid bg */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', opacity: 0.4 }}>
        <div style={{
          position: 'absolute', inset: '-200px',
          backgroundImage: 'linear-gradient(rgba(79,156,249,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79,156,249,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          animation: 'gridScroll 30s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(79,156,249,0.12) 0%, transparent 65%)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Nav ── */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(8,10,18,0.8)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #4f9cf9 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
              boxShadow: '0 0 20px rgba(79,156,249,0.4)',
            }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#e8eaf0' }}>ShockMap</span>
            <span style={{
              fontSize: '0.6rem', color: 'var(--primary)', fontFamily: 'var(--mono)',
              border: '1px solid rgba(79,156,249,0.3)', borderRadius: 4,
              padding: '2px 6px', letterSpacing: '0.06em',
            }}>INTELLIGENCE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}
              onClick={() => navigate('/backtest')}
            >COVID PROOF</button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem' }}
              onClick={() => { login(); navigate('/'); }}
            >Sign In</button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '100px 48px 80px', textAlign: 'center' }}>
          {/* Status pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: isDemoMode ? 'rgba(79,156,249,0.08)' : 'rgba(16,185,129,0.08)',
            border: isDemoMode ? '1px solid rgba(79,156,249,0.2)' : '1px solid rgba(16,185,129,0.2)',
            borderRadius: 999, padding: '6px 16px', marginBottom: 28,
            fontSize: '0.72rem', color: isDemoMode ? 'var(--primary)' : '#34d399',
            fontFamily: 'var(--mono)', letterSpacing: '0.04em',
            animation: 'fadeIn 0.6s ease',
          }}>
            <span className="live-dot" />
            {statusLabel}
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', fontWeight: 900,
            lineHeight: 1.05, letterSpacing: '-0.05em', marginBottom: 24,
            animation: 'slideUp 0.5s 0.1s ease both',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #e8eaf0 0%, #9ca3af 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Know which critical inputs</span>
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #4f9cf9 0%, #8b5cf6 50%, #34d399 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>will run short — before headlines do.</span>
          </h1>

          <p style={{
            fontSize: '1.05rem', color: 'var(--muted)', maxWidth: 560, margin: '0 auto 40px',
            lineHeight: 1.7, animation: 'slideUp 0.5s 0.2s ease both',
          }}>
            India banned paracetamol exports during COVID because one province in China shut down.
            Nobody saw it coming. <strong style={{ color: '#e8eaf0' }}>ShockMap would have — 67 days early.</strong>
          </p>

          <div style={{
            display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
            animation: 'slideUp 0.5s 0.3s ease both',
          }}>
            <button
              id="btn-live-demo"
              style={{
                padding: '14px 32px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #4f9cf9, #8b5cf6)',
                color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '0.04em',
                boxShadow: '0 4px 24px rgba(79,156,249,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(79,156,249,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(79,156,249,0.35)'; }}
              onClick={() => { enterAsGuest(); onGuest(); navigate('/'); }}
            >
              LIVE DEMO — NO LOGIN
            </button>
            <button
              id="btn-backtest"
              style={{
                padding: '14px 32px', borderRadius: 10,
                border: '1px solid rgba(244,63,94,0.3)',
                background: 'rgba(244,63,94,0.06)', color: '#f43f5e',
                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--mono)', letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.06)'}
              onClick={() => navigate('/backtest')}
            >
              SEE COVID PROOF →
            </button>
          </div>
        </section>

        {/* ── Proof stats bar ── */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 48px 80px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
            background: 'var(--border2)', borderRadius: 12, overflow: 'hidden',
          }}>
            {PROOF_STATS.map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface)',
                padding: '28px 24px', textAlign: 'center',
                borderTop: `3px solid ${s.color}`,
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${s.color}06`}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <div style={{
                  fontSize: '1.8rem', fontWeight: 900, color: s.color,
                  letterSpacing: '-0.04em', fontFamily: 'var(--mono)', lineHeight: 1,
                }}>
                  {s.val}<span style={{ fontSize: '1rem', marginLeft: 2 }}>{s.unit}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.lbl}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 48px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              fontSize: '0.65rem', fontFamily: 'var(--mono)', letterSpacing: '0.12em',
              color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 12,
            }}>3-ENGINE ARCHITECTURE</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#e8eaf0' }}>
              Built for procurement intelligence
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: '28px 28px', borderRadius: 12,
                background: 'var(--surface)',
                border: `1px solid ${f.color}20`,
                borderLeft: `3px solid ${f.color}`,
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${f.color}12`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  fontSize: '1.4rem', color: f.color, marginBottom: 14,
                  fontFamily: 'var(--mono)', lineHeight: 1,
                }}>{f.icon}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e8eaf0', marginBottom: 10 }}>{f.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.65 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live feed ── */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 48px 80px' }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '28px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="live-dot" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
                  Live Intelligence Feed
                </span>
                {critCount > 0 && (
                  <span style={{
                    background: 'rgba(244,63,94,0.12)', color: '#f43f5e',
                    border: '1px solid rgba(244,63,94,0.25)', borderRadius: 4,
                    padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--mono)',
                  }}>{critCount} CRITICAL</span>
                )}
              </div>
              <button
                onClick={() => { onGuest(); navigate('/'); }}
                style={{
                  fontSize: '0.72rem', color: 'var(--primary)', fontFamily: 'var(--mono)',
                  background: 'rgba(79,156,249,0.08)', border: '1px solid rgba(79,156,249,0.2)',
                  borderRadius: 6, padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >VIEW ALL →</button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 62 }} />)}
              </div>
            ) : shocks.length > 0 ? (
              <LiveShockTicker shocks={shocks} />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--mono)' }}>
                NO ACTIVE SHOCKS DETECTED
              </div>
            )}
          </div>
        </section>

        {/* ── CTA bottom ── */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 48px 100px', textAlign: 'center' }}>
          <div style={{
            padding: '56px 48px', borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(79,156,249,0.07) 0%, rgba(139,92,246,0.07) 100%)',
            border: '1px solid rgba(79,156,249,0.15)',
          }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 12, color: '#e8eaf0' }}>
              Ready to monitor your supply chains?
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.65 }}>
              Select your sectors, explore the dependency graph, run simulations, and generate AI-backed procurement plans in minutes.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '14px 32px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #4f9cf9, #8b5cf6)',
                  color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '0.04em',
                  boxShadow: '0 4px 20px rgba(79,156,249,0.3)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                onClick={() => { onGuest(); navigate('/'); }}
              >START LIVE DEMO</button>
              <button
                style={{
                  padding: '14px 32px', borderRadius: 10,
                  border: '1px solid var(--border2)',
                  background: 'var(--surface2)', color: 'var(--text)',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                }}
                onClick={() => navigate('/sectors')}
              >Select Sectors →</button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingBottom: 48, color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>
          BUILT FOR GOOGLE AI HACKATHON 2026 · MIT LICENSE ·{' '}
          <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>GITHUB</a>
        </div>
      </div>
    </div>
  );
}
