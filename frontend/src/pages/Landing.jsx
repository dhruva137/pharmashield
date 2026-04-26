/* Landing page — Screen 0 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const SEV_DOT = { CRITICAL: '#f43f5e', HIGH: '#f59e0b', MEDIUM: '#60a5fa', LOW: '#6b7280' };

function LiveShockTicker({ shocks }) {
  if (!shocks.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {shocks.slice(0, 4).map(s => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '12px 16px',
          animation: 'slide-up 0.4s ease forwards',
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
            background: SEV_DOT[s.severity] || '#6b7280',
            boxShadow: `0 0 8px ${SEV_DOT[s.severity] || '#6b7280'}80`,
            animation: s.severity === 'CRITICAL' ? 'pulse-dot 2s infinite' : 'none',
          }} />
          <div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.4, color: '#e8eaf0' }}>{s.title}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 3 }}>
              {s.sector === 'rare_earth' ? '⛏️ Rare Earths' : '💊 Pharma'} ·{' '}
              {s.province ? `${s.province} · ` : ''}
              <span style={{ color: SEV_DOT[s.severity] }}>{s.severity}</span> ·{' '}
              {new Date(s.detected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Landing({ onGuest }) {
  const navigate = useNavigate();
  const [shocks, setShocks] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getShocks({ limit: 6 }),
      api.health().catch(() => null),
    ])
      .then(([s, hz]) => {
        setShocks(s || []);
        setHealth(hz);
      })
      .catch(() => setShocks([]))
      .finally(() => setLoading(false));
  }, []);

  const critCount  = shocks.filter(s => s.severity === 'CRITICAL').length;
  const isDemoMode = health?.demo_mode === true;
  const isHybridFeed = health?.shock_feed_mode === 'hybrid_demo_live';
  const isDemoOnly = health?.shock_feed_mode === 'demo';
  const statusLabel = isHybridFeed
    ? 'Hybrid feed active | live shocks + curated scenarios'
    : isDemoOnly
      ? 'Curated scenario mode active'
      : 'GDELT monitoring active | updates every 15 min';
  const helperText = isHybridFeed
    ? `Showing ${health?.live_shocks || 0} current shock${health?.live_shocks === 1 ? '' : 's'} plus curated scenarios so the full workflow stays populated.`
    : isDemoOnly
      ? 'Curated scenarios are active so the full workflow stays populated when external feeds are quiet.'
      : null;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 24px',
    }}>
      {/* Gradient backdrop */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,156,249,0.08) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <div style={{ width: '100%', maxWidth: 760, zIndex: 1, paddingTop: 80 }}>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #4f9cf9, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>ShockMap</span>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem' }}
            onClick={() => navigate('/sectors')}
          >
            Sign In
          </button>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: isDemoMode ? 'rgba(79,156,249,0.1)' : 'rgba(16,185,129,0.1)',
            border: isDemoMode ? '1px solid rgba(79,156,249,0.25)' : '1px solid rgba(16,185,129,0.25)',
            borderRadius: 999, padding: '5px 14px', marginBottom: 24,
            fontSize: '0.75rem', color: isDemoMode ? 'var(--primary)' : 'var(--green)',
          }}>
            <span className="live-dot" />
            {statusLabel}
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800,
            lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 20,
            background: 'linear-gradient(135deg, #e8eaf0 0%, #9ca3af 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Know which critical inputs<br />will run short — <span style={{ WebkitTextFillColor: 'transparent', background: 'linear-gradient(90deg, #4f9cf9, #8b5cf6)', WebkitBackgroundClip: 'text' }}>before headlines do.</span>
          </h1>

          <p style={{ fontSize: '1.05rem', color: 'var(--muted)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.65 }}>
            India banned paracetamol exports during COVID because one province in China shut down.
            Nobody saw it coming. ShockMap would have.
          </p>
          {helperText && (
            <p style={{ fontSize: '0.82rem', color: 'var(--primary)', margin: '-18px auto 28px', maxWidth: 520 }}>
              {helperText}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              id="btn-live-demo"
              className="btn btn-primary"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              onClick={() => { onGuest(); navigate('/'); }}
            >
              Live Demo — No Login
            </button>
            <button
              id="btn-get-access"
              className="btn btn-ghost"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              onClick={() => navigate('/sectors')}
            >
              Select Sectors →
            </button>
          </div>
        </div>

        {/* Live feed */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="live-dot" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Live Right Now
            </span>
            {critCount > 0 && (
              <span style={{
                background: 'rgba(244,63,94,0.15)', color: 'var(--accent)',
                border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: 999, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600,
              }}>
                {critCount} CRITICAL
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 64 }} />
              ))}
            </div>
          ) : shocks.length > 0 ? (
            <LiveShockTicker shocks={shocks} />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
              <span style={{ marginRight: 8 }}>🟢</span>
              No active shocks detected across monitored sectors
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: 'var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 80,
        }}>
          {[
            { label: 'Sectors Monitored', value: '2 active', sub: '+ 4 in Phase 2' },
            { label: 'GDELT Languages', value: '65', sub: 'incl. Mandarin & Russian' },
            { label: 'Update Frequency', value: '15 min', sub: 'Real-time GDELT feed' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--surface)', padding: '24px 28px' }}>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>{stat.value}</p>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{stat.label}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingBottom: 48, color: 'var(--muted)', fontSize: '0.78rem' }}>
          Built for Google AI Hackathon 2026 · MIT License
        </div>
      </div>
    </div>
  );
}
