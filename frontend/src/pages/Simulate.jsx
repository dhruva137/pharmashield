import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';

const SEVERITIES = [
  { value: 'warning',          label: 'Warning',          desc: 'Early signs, low impact',  factor: 0.3 },
  { value: 'partial_shutdown', label: 'Partial Shutdown',  desc: '30–70% capacity loss',     factor: 0.6 },
  { value: 'full_shutdown',    label: 'Full Shutdown',     desc: '100% production halt',      factor: 1.0 },
];

const COMM_COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#a78bfa'];

function riskColor(score) {
  if (score >= 75) return '#f43f5e';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#60a5fa';
  return '#10b981';
}

function RiskBar({ score }) {
  const color = riskColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, score)}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.72rem', color, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

export default function Simulate() {
  const [searchParams] = useSearchParams();
  const [provinces, setProvinces]     = useState([]);
  const [province, setProvince]       = useState('');
  const [duration, setDuration]       = useState(30);
  const [severity, setSeverity]       = useState('partial_shutdown');
  const [result, setResult]           = useState(null);
  const [propagation, setPropagation] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [autoRan, setAutoRan]         = useState(false);

  useEffect(() => {
    api.getGraph()
      .then(g => {
        const ps = (g.nodes || []).filter(n => n.type === 'province');
        setProvinces(ps);
        // Pre-fill from URL params
        const urlProvince  = searchParams.get('province');
        const urlSeverity  = searchParams.get('severity');
        const urlDuration  = searchParams.get('duration');
        const matched = urlProvince
          ? ps.find(p => p.name?.toLowerCase() === urlProvince.toLowerCase() || p.id?.toLowerCase() === urlProvince.toLowerCase())
          : null;
        const targetId = matched?.id || (ps.length ? ps[0].id : '');
        setProvince(targetId);
        if (urlSeverity) setSeverity(urlSeverity);
        if (urlDuration) setDuration(Number(urlDuration));
      })
      .catch(() => {})
      .finally(() => setGraphLoading(false));
  }, []);

  // Auto-run if URL had province param — province/severity/duration now set, trigger
  useEffect(() => {
    if (!autoRan && province && searchParams.get('province') && !graphLoading) {
      setAutoRan(true);
      // Small delay to ensure state is fully committed
      setTimeout(run, 50);
    }
  }, [province, graphLoading, autoRan]);

  async function run() {
    if (!province) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPropagation(null);
    try {
      const [simRes, propRes] = await Promise.all([
        api.simulate(province, Number(duration), severity),
        api.getPropagation(province).catch(() => null),
      ]);
      setResult(simRes);
      setPropagation(propRes);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Merge simulate result + propagation data for richer display
  const affectedWithPR = result?.affected_drugs?.map(drug => {
    const prData = propagation?.affected_nodes?.[drug.id];
    return {
      ...drug,
      risk: drug.current_risk || 0,
      pagerank: prData?.components?.pagerank_normalized ?? null,
      buffer_days: prData?.components?.buffer_days ?? null,
      substitutability: prData?.components?.substitutability ?? null,
      community_label: prData?.components?.community_label ?? null,
      community_amp: prData?.components?.community_amplifier ?? null,
    };
  }) || [];

  return (
    <div style={{ padding: '28px 32px', animation: 'fade-in 0.35s ease' }}>
      <div style={{ marginBottom: 20, borderBottom: '1px solid var(--border2)', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--mono)', margin: 0 }}>
            SHOCK IMPACT SIMULATOR
          </h1>
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: 'rgba(244,114,182,0.12)', color: '#f472b6',
            border: '1px solid rgba(244,114,182,0.25)',
            fontFamily: 'var(--mono)', letterSpacing: '0.07em',
          }}>
            ENGINE 2
          </span>
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: 'rgba(59,130,246,0.1)', color: 'var(--primary)',
            border: '1px solid rgba(59,130,246,0.2)',
            fontFamily: 'var(--mono)', letterSpacing: '0.07em',
          }}>
            PAGERANK
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          R = PR(shock) × (1−S) × e^(−B/τ) × C
        </p>
      </div>

      {/* Pre-fill context banner */}
      {searchParams.get('province') && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          padding: '10px 14px', background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8,
          fontSize: '0.75rem', color: '#f59e0b', fontFamily: 'var(--mono)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
          PRE-FILLED FROM DASHBOARD — Province: {searchParams.get('province')} · Severity: {searchParams.get('severity') || 'partial_shutdown'}
        </div>
      )}

      {/* ── War Room: 2-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Config Panel (sticky) ── */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'var(--mono)' }}>
              Shock Origin
            </p>
            {graphLoading ? (
              <div className="skeleton" style={{ height: 38 }} />
            ) : (
              <select
                value={province}
                onChange={e => setProvince(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', fontSize: '0.82rem',
                  background: 'var(--surface2)', border: '1px solid var(--border2)',
                  borderRadius: 8, color: 'var(--text)', outline: 'none',
                }}
              >
                {provinces.length === 0 && <option value="">No provinces loaded</option>}
                {provinces.map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </select>
            )}
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'var(--mono)' }}>
              Duration: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{duration}d</span>
              <span style={{ marginLeft: 6, color: 'var(--primary)', fontSize: '0.6rem' }}>
                factor={Math.min(1, duration / 30).toFixed(2)}
              </span>
            </p>
            <input type="range" min={1} max={180} step={1} value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--muted)', marginTop: 4 }}>
              <span>1d</span><span>90d</span><span>180d</span>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'var(--mono)' }}>
              Severity
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SEVERITIES.map(s => (
                <button key={s.value} onClick={() => setSeverity(s.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, border: '1px solid',
                    borderColor: severity === s.value ? 'var(--primary)' : 'var(--border2)',
                    background: severity === s.value ? 'rgba(79,156,249,0.1)' : 'var(--surface2)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontFamily: 'var(--mono)' }}>×{s.factor}</span>
                  </div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={run} disabled={loading || !province}
            style={{
              width: '100%', padding: '13px', background: loading ? 'var(--surface2)' : 'var(--primary)',
              color: loading ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 10,
              fontSize: '0.82rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em', fontFamily: 'var(--mono)', transition: 'all 0.2s',
            }}
          >
            {loading ? 'RUNNING SIMULATION...' : 'RUN SIMULATION'}
          </button>

          {/* Quick stats when result exists */}
          {result && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', marginBottom: 8 }}>SIMULATION SUMMARY</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ padding: '8px', background: 'rgba(244,63,94,0.06)', borderRadius: 6, borderLeft: '2px solid #f43f5e' }}>
                  <p style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>Affected</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f43f5e', fontFamily: 'var(--mono)' }}>{affectedWithPR.length}</p>
                </div>
                <div style={{ padding: '8px', background: 'rgba(245,158,11,0.06)', borderRadius: 6, borderLeft: '2px solid #f59e0b' }}>
                  <p style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>Avg Risk</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--mono)' }}>
                    {(affectedWithPR.reduce((s, d) => s + d.risk, 0) / (affectedWithPR.length || 1)).toFixed(0)}%
                  </p>
                </div>
                <div style={{ padding: '8px', background: 'rgba(96,165,250,0.06)', borderRadius: 6, borderLeft: '2px solid #60a5fa' }}>
                  <p style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>Duration</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--mono)' }}>{duration}d</p>
                </div>
                <div style={{ padding: '8px', background: 'rgba(139,92,246,0.06)', borderRadius: 6, borderLeft: '2px solid #8b5cf6' }}>
                  <p style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>Critical</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#8b5cf6', fontFamily: 'var(--mono)' }}>{affectedWithPR.filter(d => d.risk >= 75).length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Results Area ── */}
        <div>


      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, color: '#f43f5e', fontSize: '0.82rem', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Propagation Explanation */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>PROPAGATION ANALYSIS</span>
              <span style={{
                fontSize: '0.62rem', background: 'rgba(244,114,182,0.12)', color: '#f472b6',
                border: '1px solid rgba(244,114,182,0.25)', borderRadius: 4, padding: '2px 7px',
                fontFamily: 'var(--mono)',
              }}>
                Personalized PageRank
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: 10 }}>
              {result.propagation_explanation}
            </p>
            {propagation && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--muted)' }}>
                <span>Total affected: <strong style={{ color: 'var(--text)' }}>{propagation.total_affected}</strong> nodes</span>
                <span>Method: <strong style={{ color: 'var(--text)' }}>{propagation.method}</strong></span>
                <span>Community cluster: <strong style={{ color: '#818cf8' }}>#{propagation.propagation_trace?.origin_community ?? 'N/A'}</strong></span>
              </div>
            )}
            <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 8 }}>
              Simulated at {new Date(result.simulated_at).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Affected Drugs — with PageRank breakdown */}
          {affectedWithPR.length > 0 ? (
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>
                  TOP {affectedWithPR.length} AFFECTED INPUTS
                </span>
                <span style={{
                  fontSize: '0.62rem', background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
                  border: '1px solid rgba(251,191,36,0.25)', borderRadius: 999, padding: '2px 7px',
                }}>
                  R = PR × (1−S) × e^(−B/τ) × C
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {affectedWithPR.map((drug, i) => (
                  <div key={drug.id} style={{
                    padding: '12px 14px', background: 'var(--surface2)',
                    border: '1px solid var(--border2)', borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: drug.pagerank !== null ? 8 : 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {drug.name}
                        </p>
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{drug.therapeutic_class || drug.nlem_tier}</span>
                      </div>
                      <div style={{ minWidth: 160 }}>
                        <RiskBar score={drug.risk} />
                      </div>
                    </div>

                    {/* PageRank component breakdown */}
                    {drug.pagerank !== null && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                        <span style={{
                          fontSize: '0.65rem', color: '#f472b6',
                          background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.2)',
                          borderRadius: 999, padding: '2px 8px',
                        }}>
                          PR: {(drug.pagerank * 100).toFixed(1)}%
                        </span>
                        {drug.buffer_days !== null && (
                          <span style={{
                            fontSize: '0.65rem', color: '#fbbf24',
                            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                            borderRadius: 999, padding: '2px 8px',
                          }}>
                            Buffer: {drug.buffer_days}d
                          </span>
                        )}
                        {drug.substitutability !== null && (
                          <span style={{
                            fontSize: '0.65rem', color: '#60a5fa',
                            background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                            borderRadius: 999, padding: '2px 8px',
                          }}>
                            Sub: {(drug.substitutability * 100).toFixed(0)}%
                          </span>
                        )}
                        {drug.community_label && (
                          <span style={{
                            fontSize: '0.65rem', color: COMM_COLORS[i % COMM_COLORS.length],
                            background: `${COMM_COLORS[i % COMM_COLORS.length]}12`,
                            border: `1px solid ${COMM_COLORS[i % COMM_COLORS.length]}30`,
                            borderRadius: 999, padding: '2px 8px',
                          }}>
                            {drug.community_label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                No inputs significantly affected at this severity level
              </p>
            </div>
          )}

          {/* Community Propagation Summary */}
          {propagation?.propagation_trace?.propagation_edges?.length > 0 && (
            <div className="card" style={{ padding: '20px 22px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em', display: 'block', marginBottom: 14 }}>
                SUPPLY CHAIN PROPAGATION PATHS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {propagation.propagation_trace.propagation_edges.slice(0, 8).map((edge, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem',
                    padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8,
                  }}>
                    <span style={{ color: 'var(--muted)', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {edge.from}
                    </span>
                    <span style={{ color: 'var(--border2)' }}>→</span>
                    <span style={{ color: 'var(--text)', flex: 1 }}>{edge.name}</span>
                    <span style={{
                      fontSize: '0.65rem', color: 'var(--primary)',
                      background: 'rgba(79,156,249,0.1)', border: '1px solid rgba(79,156,249,0.2)',
                      borderRadius: 999, padding: '1px 7px',
                    }}>
                      w={edge.weight.toFixed ? edge.weight.toFixed(2) : edge.weight}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{edge.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Visualization Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Risk Progression Over Time */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em', display: 'block', marginBottom: 14 }}>
                RISK PROGRESSION OVER TIME
              </span>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={generateRiskProgression(duration, affectedWithPR)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13,17,23,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top Affected Drugs */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em', display: 'block', marginBottom: 14 }}>
                TOP AFFECTED DRUGS
              </span>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={affectedWithPR.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="var(--muted)" style={{ fontSize: '0.65rem' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="var(--muted)" style={{ fontSize: '0.7rem' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13,17,23,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="risk" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Supply Concentration Impact */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em', display: 'block', marginBottom: 14 }}>
              IMPACT SUMMARY
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Avg Risk Score</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>
                  {(affectedWithPR.reduce((s, d) => s + d.risk, 0) / affectedWithPR.length || 0).toFixed(0)}%
                </p>
              </div>
              <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Affected Inputs</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f43f5e' }}>
                  {affectedWithPR.length}
                </p>
              </div>
              <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Duration Factor</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#60a5fa' }}>
                  {(duration / 30).toFixed(2)}x
                </p>
              </div>
              <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Critical Risks (≥75%)</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f43f5e' }}>
                  {affectedWithPR.filter(d => d.risk >= 75).length}
                </p>
              </div>
            </div>
          </div>

          {/* Economic Cost Impact Panel */}
          {result.total_economic_impact_usd_m > 0 && (
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>
                  ECONOMIC IMPACT ESTIMATE
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  MODEL: risk-weighted market value · USD millions
                </span>
              </div>

              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'STOCKOUT COST', value: result.estimated_stockout_cost_usd_m, color: '#f43f5e' },
                  { label: 'EMERGENCY PROCUREMENT', value: result.emergency_procurement_cost_usd_m, color: '#f59e0b' },
                  { label: 'TOTAL IMPACT', value: result.total_economic_impact_usd_m, color: '#60a5fa' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 8, borderLeft: `3px solid ${kpi.color}` }}>
                    <p style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 6, letterSpacing: '0.05em' }}>{kpi.label}</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 700, color: kpi.color, fontFamily: 'var(--mono)' }}>
                      ${kpi.value.toFixed(1)}M
                    </p>
                  </div>
                ))}
              </div>

              {/* Per-drug cost bar chart */}
              {result.cost_by_drug?.length > 0 && (
                <>
                  <p style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>COST BREAKDOWN BY INPUT</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={result.cost_by_drug.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted)" style={{ fontSize: '0.65rem' }} tickFormatter={v => `$${v.toFixed(1)}M`} />
                      <YAxis type="category" dataKey="name" stroke="var(--muted)" style={{ fontSize: '0.65rem' }} width={110} />
                      <Tooltip
                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: '0.72rem' }}
                        formatter={(v, name) => [`$${v.toFixed(2)}M`, name === 'stockout_cost_usd_m' ? 'Stockout' : 'Emergency']}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
                      <Bar dataKey="stockout_cost_usd_m" name="Stockout Cost" fill="#f43f5e" radius={[0, 3, 3, 0]} />
                      <Bar dataKey="emergency_cost_usd_m" name="Emergency Procurement" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: 10, fontFamily: 'var(--mono)' }}>
                    * Indicative estimates based on risk-weighted annual market values. Not financial advice.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* No results placeholder */}
      {!result && !error && !loading && (
        <div className="card" style={{ padding: '60px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.3 }}>⚡</p>
          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Ready to Simulate</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Select a province and run a simulation to see cascading impact analysis</p>
        </div>
      )}

        </div>{/* end right column */}
      </div>{/* end 2-col grid */}
    </div>
  );
}

function generateRiskProgression(duration, affectedDrugs) {
  const data = [];
  for (let day = 0; day <= Math.min(duration, 90); day += Math.ceil(duration / 10)) {
    const riskFactor = Math.pow(day / 30, 0.8);
    const risk = affectedDrugs.length > 0
      ? (affectedDrugs.reduce((s, d) => s + d.risk, 0) / affectedDrugs.length) * Math.min(100, riskFactor * 100)
      : 0;
    data.push({ day, risk });
  }
  return data.length === 0 ? [{ day: 0, risk: 0 }] : data;
}
