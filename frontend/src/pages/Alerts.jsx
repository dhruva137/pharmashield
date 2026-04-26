/* Alerts / Live Shocks page — aggregated GDELT feed */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const SEV_COLOR = { CRITICAL: '#f43f5e', HIGH: '#f59e0b', MEDIUM: '#60a5fa', LOW: '#6b7280' };

export default function Alerts() {
  const [shocks, setShocks]     = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [health, setHealth]     = useState(null);
  const [filter, setFilter]     = useState('all');
  const [secFilter, setSecFilter] = useState('all');
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getShocks({ limit: 50 }),
      api.getAlerts({ limit: 50 }).catch(() => ({ alerts: [] })),
      api.health().catch(() => null),
    ]).then(([s, a, hz]) => {
      setShocks(s || []);
      setAlerts(a.alerts || []);
      setHealth(hz);
      setLastUpdated(new Date());
    }).finally(() => setLoading(false));
  }, []);

  const sev = ['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const secs = ['all', 'pharma', 'rare_earth'];

  const filtered = shocks
    .filter(s => filter === 'all' || s.severity === filter)
    .filter(s => secFilter === 'all' || s.sector === secFilter);
  const isHybridFeed = health?.shock_feed_mode === 'hybrid_demo_live';
  const isDemoOnly = health?.shock_feed_mode === 'demo';
  const feedLabel = isHybridFeed
    ? `Hybrid feed | ${health?.live_shocks || 0} live + ${health?.demo_scenarios || 0} scenarios`
    : isDemoOnly
      ? `Curated scenario feed | ${health?.demo_scenarios || 0} loaded`
      : 'Live GDELT feed';

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Live Shock Events</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          {feedLabel} | {shocks.length} events in view
          {lastUpdated ? ` | Last updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {sev.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '5px 14px', borderRadius: 7, border: 'none',
                fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
                background: filter === s ? (s === 'all' ? 'var(--primary)' : SEV_COLOR[s] + '20') : 'transparent',
                color: filter === s ? (s === 'all' ? '#fff' : SEV_COLOR[s]) : 'var(--muted)',
                transition: 'all 0.15s',
              }}
            >{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {secs.map(s => (
            <button key={s} onClick={() => setSecFilter(s)} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', background: secFilter === s ? 'rgba(79,156,249,0.2)' : 'transparent', color: secFilter === s ? 'var(--primary)' : 'var(--muted)', transition: 'all 0.15s' }}>
              {s === 'rare_earth' ? 'Rare Earths' : s === 'pharma' ? 'Pharma' : 'All Sectors'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
          <p>No shock events match your filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => {
            const color = SEV_COLOR[s.severity] || '#6b7280';
            return (
              <Link key={s.id} to={`/shocks/${s.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface)', border: `1px solid ${color}25`,
                  borderLeft: `3px solid ${color}`, borderRadius: 12,
                  padding: '14px 18px', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.severity}</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: s.data_mode === 'demo' ? 'var(--primary)' : 'var(--green)', background: s.data_mode === 'demo' ? 'rgba(79,156,249,0.08)' : 'rgba(16,185,129,0.08)', border: s.data_mode === 'demo' ? '1px solid rgba(79,156,249,0.2)' : '1px solid rgba(16,185,129,0.2)', borderRadius: 999, padding: '2px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {s.data_mode === 'demo' ? 'SCENARIO' : 'LIVE'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>|</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {s.sector === 'rare_earth' ? 'Rare Earths' : 'Pharma'}
                      </span>
                      {s.province && <>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>|</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{s.province}</span>
                      </>}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.4 }}>{s.title}</p>
                    {s.source_url && (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source {'->'}
                      </a>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {new Date(s.detected_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3 }}>{s.source}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Seed alerts from backend */}
      {alerts.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Seed Database Alerts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map(a => (
              <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 14 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: SEV_COLOR[a.severity] || '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 1, flexShrink: 0 }}>{a.severity}</span>
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.4 }}>{a.summary}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 3 }}>
                    {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
