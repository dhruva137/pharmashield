/* Main Dashboard — Screen 2 — 3-Engine Architecture */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const SEV_COLOR = { CRITICAL: '#f43f5e', HIGH: '#f59e0b', MEDIUM: '#60a5fa', LOW: '#6b7280' };
const COMM_COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#a78bfa', '#fb923c'];

function RiskBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? '#f43f5e' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#60a5fa' : '#10b981';
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="risk-bar-track" style={{ flex: 1, height: 4 }}>
          <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span style={{ fontSize: '0.72rem', color, marginLeft: 10, minWidth: 32, textAlign: 'right', fontWeight: 600 }}>
          {pct.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function ShockCard({ shock }) {
  const color = SEV_COLOR[shock.severity] || '#6b7280';
  const severity = shock.severity === 'CRITICAL' ? 'full_shutdown' : shock.severity === 'HIGH' ? 'partial_shutdown' : 'warning';
  return (
    <div style={{
      background: 'var(--surface2)', border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: '0.68rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--mono)' }}>
          {shock.severity}
        </span>
        <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
          {new Date(shock.detected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <Link to={`/shocks/${shock.id}`} style={{ textDecoration: 'none' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.4, marginBottom: 8 }}>
          {shock.title}
        </p>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {shock.province && (
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontFamily: 'var(--mono)' }}>
              {shock.province}
            </span>
          )}
          <span style={{ fontSize: '0.65rem', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px' }}>
            {shock.sector === 'rare_earth' ? 'Rare Earths' : shock.sector === 'energy' ? 'Energy' : 'Pharma'}
          </span>
        </div>
        {shock.province && (
          <Link
            to={`/simulate?province=${encodeURIComponent(shock.province)}&severity=${severity}&duration=30`}
            style={{
              fontSize: '0.62rem', fontWeight: 700, color: '#f59e0b',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 4, padding: '3px 8px', textDecoration: 'none',
              fontFamily: 'var(--mono)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
          >
            SIMULATE
          </Link>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <p style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', color: color || 'var(--text)', marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{sub}</p>
    </div>
  );
}

function EngineStatusBar({ engines }) {
  if (!engines) return null;
  return (
    <div style={{
      display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20,
      animation: 'fade-in 0.5s ease',
    }}>
      {Object.entries(engines).map(([key, eng]) => (
        <div key={key} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: 'var(--surface2)',
          border: '1px solid var(--border2)', borderRadius: 10,
          fontSize: '0.72rem',
        }}>
          <span className="live-dot" style={{
            width: 6, height: 6,
            background: eng.status === 'active' ? 'var(--green)' : 'var(--muted)',
          }} />
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{eng.name}</span>
          <span style={{ color: 'var(--muted)' }}>·</span>
          <span style={{ color: 'var(--muted)' }}>{eng.method}</span>
          {eng.active_mode && (
            <span style={{
              background: eng.active_mode === 'pagerank' ? 'rgba(251,191,36,0.12)' : 'rgba(16,185,129,0.12)',
              color: eng.active_mode === 'pagerank' ? '#fbbf24' : '#10b981',
              border: `1px solid ${eng.active_mode === 'pagerank' ? 'rgba(251,191,36,0.25)' : 'rgba(16,185,129,0.25)'}`,
              borderRadius: 999,
              padding: '1px 7px',
              fontSize: '0.65rem',
            }}>
              {eng.active_mode}
            </span>
          )}
          {eng.communities_detected && (
            <span style={{
              background: 'rgba(129,140,248,0.12)', color: '#818cf8',
              border: '1px solid rgba(129,140,248,0.25)', borderRadius: 999,
              padding: '1px 7px', fontSize: '0.65rem',
            }}>
              {eng.communities_detected} clusters
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function CommunityPanel({ communities }) {
  if (!communities || !communities.communities) return null;
  const clusters = communities.communities.filter(c => c.size > 2).slice(0, 5);
  if (clusters.length === 0) return null;

  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>🔗 Supply Chain Clusters</span>
        <span style={{
          fontSize: '0.65rem', background: 'rgba(129,140,248,0.12)', color: '#818cf8',
          border: '1px solid rgba(129,140,248,0.25)', borderRadius: 999, padding: '2px 8px',
        }}>
          Louvain Community Detection
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {clusters.map((c, i) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: 'var(--surface2)',
            border: `1px solid ${COMM_COLORS[i % COMM_COLORS.length]}25`,
            borderLeft: `3px solid ${COMM_COLORS[i % COMM_COLORS.length]}`,
            borderRadius: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                {c.label}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.provinces.slice(0, 3).map(p => (
                  <span key={p} style={{
                    fontSize: '0.65rem', color: COMM_COLORS[i % COMM_COLORS.length],
                    background: `${COMM_COLORS[i % COMM_COLORS.length]}12`,
                    border: `1px solid ${COMM_COLORS[i % COMM_COLORS.length]}30`,
                    borderRadius: 999, padding: '1px 6px',
                  }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: COMM_COLORS[i % COMM_COLORS.length] }}>
                {c.size}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>nodes</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ sectors = ['pharma', 'rare_earth'] }) {
  const [shocks, setShocks]         = useState([]);
  const [drugs, setDrugs]           = useState([]);
  const [engines, setEngines]       = useState(null);
  const [communities, setCommunities] = useState(null);
  const [health, setHealth]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getShocks({ limit: 20 }),
      api.getDrugs({ limit: 50 }),
      api.getEngineStatus().catch(() => null),
      api.getCommunities().catch(() => null),
      api.health().catch(() => null),
    ]).then(([s, d, eng, comm, hz]) => {
      setShocks(s || []);
      setDrugs(d.drugs || []);
      setEngines(eng);
      setCommunities(comm);
      setHealth(hz);
      const latestShock = (s || [])
        .map(item => new Date(item.detected_at || item.published_at || 0))
        .sort((a, b) => b - a)[0];
      setLastUpdated(latestShock || new Date());
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Filter shocks to selected sectors
  const filteredShocks = shocks.filter(s => sectors.includes(s.sector));

  const critShocks = filteredShocks.filter(s => s.severity === 'CRITICAL');
  const highShocks = filteredShocks.filter(s => s.severity === 'HIGH');
  const medShocks  = filteredShocks.filter(s => s.severity === 'MEDIUM');
  const isDemoMode = health?.demo_mode === true;
  const isHybridFeed = health?.shock_feed_mode === 'hybrid_demo_live';
  const modeLabel = isHybridFeed ? 'Hybrid feed' : isDemoMode ? 'Demo scenarios' : health?.gemini_ready === false ? 'Degraded mode' : 'GDELT live';
  const modeColor = (isDemoMode || isHybridFeed)
    ? { color: 'var(--primary)', bg: 'rgba(79,156,249,0.1)', border: '1px solid rgba(79,156,249,0.2)' }
    : health?.gemini_ready === false
      ? { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }
      : { color: 'var(--green)', bg: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' };

  const topRisk = [...drugs].sort((a, b) => (b.current_risk || b.criticality_score || 0) - (a.current_risk || a.criticality_score || 0)).slice(0, 8);

  // Province HHI heatmap data
  const provinceRisks = [
    { name: 'Hebei', score: 0.89, sector: 'pharma' },
    { name: 'Jiangsu', score: 0.84, sector: 'rare_earth' },
    { name: 'Inner Mongolia', score: 0.81, sector: 'rare_earth' },
    { name: 'Zhejiang', score: 0.72, sector: 'pharma' },
    { name: 'Shandong', score: 0.68, sector: 'pharma' },
    { name: 'Hubei', score: 0.54, sector: 'pharma' },
  ].filter(p => sectors.includes(p.sector) || p.sector === 'rare_earth');

  if (loading) return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="skeleton" style={{ height: 300 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', animation: 'fade-in 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            National Risk Overview
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            {sectors.map(s => s === 'rare_earth' ? 'Rare Earths' : s === 'energy' ? 'Energy' : 'Pharma').join(' | ')} |{' '}
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'loading...'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: modeColor.color, background: modeColor.bg, border: modeColor.border, borderRadius: 999, padding: '5px 14px' }}>
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          {modeLabel}
        </div>
      </div>

      {/* Engine Status Bar */}
      <EngineStatusBar engines={engines} />

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Critical Shocks" value={critShocks.length} sub="Immediate action" color={critShocks.length > 0 ? '#f43f5e' : undefined} />
        <StatCard label="High Risk" value={highShocks.length} sub="Monitor closely" color={highShocks.length > 0 ? '#f59e0b' : undefined} />
        <StatCard label="Under Watch" value={medShocks.length} sub="Medium severity" />
        <StatCard
          label="Inputs Tracked"
          value={drugs.length + 8}
          sub={isHybridFeed ? 'Hybrid live + scenario graph' : isDemoMode ? 'Curated scenario graph' : 'Pharma + Rare Earths'}
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Live shocks feed */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-dot" style={{ width: 7, height: 7 }} />
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Active Shock Events</span>
            </div>
            <Link to="/alerts" style={{ fontSize: '0.75rem', color: 'var(--muted)', textDecoration: 'none' }}>
              View all {'->'}
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredShocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '0.83rem' }}>
                No active shocks in monitored sectors
              </div>
            ) : (
              filteredShocks.slice(0, 4).map(s => <ShockCard key={s.id} shock={s} />)
            )}
          </div>
        </div>

        {/* Top risk inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Top Risk Inputs</span>
                <span style={{
                  fontSize: '0.62rem', background: 'rgba(244,114,182,0.12)', color: '#f472b6',
                  border: '1px solid rgba(244,114,182,0.25)', borderRadius: 999, padding: '2px 7px',
                }}>
                  PageRank
                </span>
              </div>
              <Link to="/drugs" style={{ fontSize: '0.75rem', color: 'var(--muted)', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topRisk.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>No drug data - start the backend</p>
              ) : (
                topRisk.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/drugs/${d.id}`} style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.name}
                      </Link>
                      <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{d.therapeutic_class || d.nlem_tier}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                      <RiskBar score={d.current_risk || d.criticality_score || 0} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Province HHI heatmap */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Dependency Concentration (HHI)
              </span>
              <span style={{
                fontSize: '0.62rem', background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.25)', borderRadius: 999, padding: '2px 7px',
              }}>
                Herfindahl-Hirschman
              </span>
            </div>
            {provinceRisks.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: '0.78rem', minWidth: 110, color: 'var(--text)' }}>{p.name}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${p.score * 100}%`,
                    background: p.score >= 0.85 ? 'var(--accent)' : p.score >= 0.7 ? 'var(--amber)' : 'var(--primary)',
                    borderRadius: 4, transition: 'width 0.8s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, minWidth: 36, textAlign: 'right', color: p.score >= 0.85 ? 'var(--accent)' : p.score >= 0.7 ? 'var(--amber)' : 'var(--primary)' }}>
                  {p.score.toFixed(2)}
                </span>
                <Link
                  to={`/simulate?province=${encodeURIComponent(p.name)}&severity=partial_shutdown`}
                  style={{
                    fontSize: '0.62rem', fontWeight: 700, color: 'var(--primary)',
                    background: 'rgba(79,156,249,0.1)', border: '1px solid rgba(79,156,249,0.25)',
                    borderRadius: 4, padding: '3px 8px', textDecoration: 'none',
                    fontFamily: 'var(--mono)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,156,249,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,156,249,0.1)'}
                >
                  RUN IMPACT
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Community Clusters + Quick Ask — 2 col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Community Clusters */}
        <CommunityPanel communities={communities} />

        {/* Quick ask */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Ask ShockMap</span>
            <span style={{ fontSize: '0.68rem', background: 'rgba(79,156,249,0.12)', color: 'var(--primary)', border: '1px solid rgba(79,156,249,0.25)', borderRadius: 999, padding: '2px 8px' }}>{isDemoMode ? 'Scenario-backed analyst' : 'Gemini 2.0 Flash'}</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {isDemoMode
              ? 'Curated response flow backed by realistic shock scenarios, policy snippets, and deterministic action plans.'
              : 'Grounded RAG with NLEM, Comtrade & historical disruption data. Generates specific action plans with supplier names and quantities.'}
          </p>
          <Link
            to="/query"
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 18px', background: 'var(--surface2)',
              border: '1px solid var(--border2)', borderRadius: 10,
              cursor: 'pointer', textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(79,156,249,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          >
            <span style={{ fontSize: '0.88rem', color: 'var(--muted)', flex: 1 }}>
              "Which drugs are at risk if Hebei shuts for 2 weeks?"
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Ask {'->'}</span>
          </Link>
        </div>
      </div>

      {/* Advanced Supply Chain Metrics */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Supply Concentration Index */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Supply Concentration</span>
            <span style={{ fontSize: '0.62rem', background: 'rgba(244,114,182,0.12)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.25)', borderRadius: 999, padding: '2px 7px' }}>
              India
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Pharma APIs</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '72%', background: '#f59e0b' }} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>72%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Rare Earths</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '89%', background: '#f43f5e' }} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f43f5e' }}>89%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Energy (Hormuz)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '85%', background: '#f43f5e' }} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f43f5e' }}>85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Buffer Capacity */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Stockpile Buffer</span>
            <span style={{ fontSize: '0.62rem', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 999, padding: '2px 7px' }}>
              Critical
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Paracetamol</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24' }}>8 days</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '40%', background: '#fbbf24' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Neodymium</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f43f5e' }}>5 days</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '25%', background: '#f43f5e' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Strategic Oil Reserve</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>87 days</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '86%', background: '#f59e0b' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Geopolitical Risk Index */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Geopolitical Risk</span>
            <span style={{ fontSize: '0.62rem', background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 999, padding: '2px 7px' }}>
              High
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>China-Rare Earths</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f43f5e' }}>7.8/10</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '78%', background: '#f43f5e' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>USA-Pharma APIs</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#60a5fa' }}>3.2/10</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '32%', background: '#60a5fa' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Hormuz-Oil</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f43f5e' }}>9.1/10</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '91%', background: '#f43f5e' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
