import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

const STATIC_HEADLINES = [
  { sev: 'CRITICAL', text: 'Strait of Hormuz remains blocked — Day 59 · IRGC forces maintaining naval cordon', color: '#ef4444' },
  { sev: 'HIGH',     text: 'Air cargo rates Dubai→Mumbai up 350% · Diversion via Cape of Good Hope adds 14 days to EU routes', color: '#f59e0b' },
  { sev: 'HIGH',     text: 'Vitamin C (API) stockout projected in 25 days · 92% China dependency via restricted corridor', color: '#f59e0b' },
  { sev: 'MEDIUM',   text: 'Sun Pharma equity down 4.2% · ShockMap flagged Hebei disruption 11 days prior', color: '#3b82f6' },
  { sev: 'HIGH',     text: 'UN warns 9.1M people face food insecurity in Asia due to grain route closure', color: '#f59e0b' },
  { sev: 'CRITICAL', text: 'Paracetamol API: 5 of top 8 Chinese producers affected by logistics gridlock', color: '#ef4444' },
  { sev: 'MEDIUM',   text: 'GDELT Engine 1: 14 new supply disruption signals detected in last 15 minutes', color: '#3b82f6' },
  { sev: 'HIGH',     text: 'Shipping insurance premiums up 400% · Mundra Port congestion at 87% capacity', color: '#f59e0b' },
];

export default function NewsTicker() {
  const [headlines, setHeadlines] = useState(STATIC_HEADLINES);
  const [paused, setPaused] = useState(false);
  const tickerRef = useRef(null);

  useEffect(() => {
    // Try to pull live shocks for extra ticker items
    api.getShocks?.({ limit: 6 }).then(data => {
      if (!data?.shocks?.length) return;
      const live = data.shocks.slice(0, 6).map(s => ({
        sev: s.severity?.toUpperCase() || 'INFO',
        text: `[LIVE] ${s.title || s.description || 'Supply disruption detected'}`,
        color: s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f59e0b' : '#3b82f6',
      }));
      setHeadlines(prev => [...live, ...prev]);
    }).catch(() => {});
  }, []);

  // Duplicate headlines for seamless loop
  const items = [...headlines, ...headlines];

  return (
    <div
      style={{
        width: '100%',
        height: 32,
        background: 'rgba(0,0,0,0.35)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        backdropFilter: 'blur(8px)',
        flexShrink: 0,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Left badge */}
      <div style={{
        flexShrink: 0,
        padding: '0 12px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: '#ef4444',
        gap: 6,
        zIndex: 2,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#fff', display: 'inline-block',
          animation: 'pulse-dot 1.5s ease-in-out infinite',
        }} />
        <span style={{
          fontSize: '0.6rem', fontWeight: 800, color: '#fff',
          fontFamily: 'var(--mono)', letterSpacing: '0.12em', whiteSpace: 'nowrap',
        }}>LIVE INTEL</span>
      </div>

      {/* Scrolling track */}
      <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
        <div
          ref={tickerRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            animation: paused ? 'none' : 'ticker-scroll 60s linear infinite',
            willChange: 'transform',
            whiteSpace: 'nowrap',
          }}
        >
          {items.map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingRight: 40 }}>
              <span style={{
                fontSize: '0.55rem', fontWeight: 800, fontFamily: 'var(--mono)',
                padding: '1px 5px', borderRadius: 3,
                background: item.color + '22', color: item.color,
                border: `1px solid ${item.color}44`,
                letterSpacing: '0.08em', flexShrink: 0,
              }}>{item.sev}</span>
              <span style={{
                fontSize: '0.7rem', color: 'rgba(212,216,232,0.85)',
                fontFamily: 'var(--mono)', letterSpacing: '0.01em',
              }}>{item.text}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', paddingLeft: 8 }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* Fade edges */}
      <div style={{ position: 'absolute', left: 100, top: 0, bottom: 0, width: 32, background: 'linear-gradient(90deg, var(--bg), transparent)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, background: 'linear-gradient(270deg, var(--bg), transparent)', pointerEvents: 'none', zIndex: 1 }} />

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
