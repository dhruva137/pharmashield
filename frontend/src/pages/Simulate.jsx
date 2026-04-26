import { useState, useEffect } from 'react';
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
  const [provinces, setProvinces]     = useState([]);
  const [province, setProvince]       = useState('');
  const [duration, setDuration]       = useState(30);
  const [severity, setSeverity]       = useState('partial_shutdown');
  const [result, setResult]           = useState(null);
  const [propagation, setPropagation] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [graphLoading, setGraphLoading] = useState(true);

  useEffect(() => {
    api.getGraph()
      .then(g => {
        const ps = (g.nodes || []).filter(n => n.type === 'province');
        setProvinces(ps);
        if (ps.length) setProvince(ps[0].id);
      })
      .catch(() => {})
      .finally(() => setGraphLoading(false));
  }, []);

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
    <div style={{ padding: '28px 32px', maxWidth: 900, animation: 'fade-in 0.35s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Shock Simulator
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Model downstream impact via Personalized PageRank ·{' '}
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--muted)' }}>
            R = PR(shock) × (1-S) × e^(−B/τ) × C
          </span>
        </p>
      </div>

      {/* Config Card */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 20 }}>

        {/* Province */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Shock Origin — Province / Region
          </label>
          {graphLoading ? (
            <div className="skeleton" style={{ height: 38 }} />
          ) : (
            <select
              value={province}
              onChange={e => setProvince(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', fontSize: '0.85rem',
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

        {/* Duration */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Duration: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{duration} days</span>
            <span style={{ marginLeft: 8, color: 'var(--primary)', fontSize: '0.65rem' }}>
              τ = 30d (pharma) · duration factor = {Math.min(1, duration / 30).toFixed(2)}
            </span>
          </label>
          <input type="range" min={1} max={180} step={1} value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--muted)', marginTop: 4 }}>
            <span>1 day</span><span>90 days</span><span>180 days</span>
          </div>
        </div>

        {/* Severity */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Disruption Severity
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {SEVERITIES.map(s => (
              <button key={s.value} onClick={() => setSeverity(s.value)}
                style={{
                  padding: '12px 14px', borderRadius: 10, border: '1px solid',
                  borderColor: severity === s.value ? 'var(--primary)' : 'var(--border2)',
                  background: severity === s.value ? 'rgba(79,156,249,0.1)' : 'var(--surface2)',
                  textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{s.desc}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--primary)', marginTop: 4 }}>
                  severity × {s.factor}
                </p>
              </button>
            ))}
          </div>
        </div>

        <button onClick={run} disabled={loading || !province}
          style={{
            width: '100%', padding: '12px', background: loading ? 'var(--surface2)' : 'var(--primary)',
            color: loading ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 10,
            fontSize: '0.85rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? '⏳ Running PageRank simulation…' : '⚡ Run Simulation'}
        </button>
      </div>

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
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>📊 Propagation Analysis</span>
              <span style={{
                fontSize: '0.62rem', background: 'rgba(244,114,182,0.12)', color: '#f472b6',
                border: '1px solid rgba(244,114,182,0.25)', borderRadius: 999, padding: '2px 7px',
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
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  Top {affectedWithPR.length} Affected Inputs
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
              <span style={{ fontWeight: 600, fontSize: '0.88rem', display: 'block', marginBottom: 14 }}>
                🔗 Supply Chain Propagation Paths
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
        </div>
      )}
    </div>
  );
}
