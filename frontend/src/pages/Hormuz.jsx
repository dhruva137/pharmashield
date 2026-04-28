import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Ship, AlertTriangle, Clock, Info, ShieldAlert, Zap } from 'lucide-react';

/* ── Tiny reusable card ─────────────────────────────────────────────────── */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    ...style,
  }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
    {children}
  </div>
);

const BigVal = ({ children, color = 'var(--text)' }) => (
  <div style={{ fontSize: '1.4rem', fontWeight: 800, color, fontFamily: 'var(--mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>
    {children}
  </div>
);

const Row = ({ label, value, valueColor = 'var(--text)' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{label}</span>
    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: valueColor, fontFamily: 'var(--mono)' }}>{value}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const color = status === 'CRITICAL' ? '#ef4444' : status === 'ELEVATED' ? '#f59e0b' : '#10b981';
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 4,
      background: color + '18', color, border: `1px solid ${color}45`,
      fontFamily: 'var(--mono)', letterSpacing: '0.06em',
    }}>{status}</span>
  );
};

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function HormuzTracker() {
  const [status,   setStatus]   = useState(null);
  const [impact,   setImpact]   = useState(null);
  const [affected, setAffected] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [prediction,     setPrediction]     = useState('');
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    Promise.all([
      api.getHormuzStatus(),
      api.getHormuzImpact(),
      api.getHormuzAffectedApis(),
      api.getHormuzTimeline(),
    ]).then(([s, i, a, t]) => {
      setStatus(s); setImpact(i); setAffected(a); setTimeline(t);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePredict = async () => {
    setLoadingPredict(true);
    try {
      const res = await api.predictHormuzShortage(90);
      setPrediction(res.prediction);
    } catch {
      setPrediction('Prediction service temporarily unavailable.');
    } finally {
      setLoadingPredict(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(239,68,68,0.2)', borderTop: '2px solid #ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>INITIALISING HORMUZ INTELLIGENCE...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <Card style={{
        padding: '22px 28px', marginBottom: 22,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 16,
        background: 'linear-gradient(135deg, var(--surface) 0%, rgba(239,68,68,0.04) 100%)',
        borderColor: 'rgba(239,68,68,0.2)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
              Hormuz Crisis Tracker
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444', animation: 'pulse-dot 2s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--mono)', letterSpacing: '0.1em' }}>LIVE CRISIS</span>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', maxWidth: 520, margin: 0, lineHeight: 1.6 }}>
            Monitoring the Strait of Hormuz blockade (Active since Feb 28, 2026).
            Tracking 84% of Indian pharma export exposure and 40% oil supply disruption.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <Label>Severity</Label>
            <BigVal color="#ef4444">{status?.severity}</BigVal>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24, textAlign: 'right' }}>
            <Label>Days Active</Label>
            <BigVal>{status?.days_since_closure}</BigVal>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24, textAlign: 'right' }}>
            <Label>Risk Level</Label>
            <BigVal color="#f59e0b">{status?.risk_level ? `${(status.risk_level * 100).toFixed(0)}%` : '—'}</BigVal>
          </div>
        </div>
      </Card>

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 360px', gap: 18, marginBottom: 18 }}>

        {/* Critical Impact */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Critical Impact</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { lbl: 'Oil Supply',   val: impact?.oil_supply_affected,      color: '#ef4444' },
              { lbl: 'Export Risk',  val: impact?.export_exposure,           color: '#f59e0b' },
              { lbl: 'Air Cargo +', val: impact?.air_cargo_rate_increase,   color: '#ef4444' },
              { lbl: 'Food Risk',   val: impact?.food_insecurity_risk,      color: '#f59e0b' },
            ].map((m, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <Label>{m.lbl}</Label>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: m.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{m.val}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Logistics */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Logistics Alert</span>
          </div>
          <div>
            <Row label="Shipping Delay"       value={impact?.pharma_export_delay} />
            <Row label="Insurance Premium"    value={impact?.shipping_insurance_premium} valueColor="#ef4444" />
            <Row label="Vessels Diverted"     value={status?.vessels_diverted} />
            <Row label="Headlines Status"     value="RESTRICTED" valueColor="#ef4444" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Route via Cape</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--mono)' }}>+12-14 days</span>
            </div>
          </div>
        </Card>

        {/* Gemini 90-day prediction */}
        <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', borderColor: 'rgba(59,130,246,0.2)', background: 'linear-gradient(135deg, var(--surface), rgba(59,130,246,0.03))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={17} fill="var(--primary)" style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>90-Day Outlook</span>
            </div>
            <span style={{ fontSize: '0.55rem', color: 'var(--muted)', fontFamily: 'var(--mono)', opacity: 0.7 }}>GEMINI 2.5 FLASH</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 100, marginBottom: 14 }}>
            {prediction ? (
              <pre style={{
                fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--mono)',
                whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0,
              }}>{prediction}</pre>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, gap: 8, opacity: 0.5, textAlign: 'center' }}>
                <Info size={28} style={{ color: 'var(--muted)' }} />
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: 0 }}>
                  Generate AI shortage prediction based on crisis duration
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handlePredict}
            disabled={loadingPredict}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
              background: loadingPredict ? 'var(--surface2)' : 'var(--primary)',
              color: loadingPredict ? 'var(--muted)' : '#fff',
              fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--mono)',
              letterSpacing: '0.08em', cursor: loadingPredict ? 'wait' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loadingPredict ? '⟳ ANALYSING...' : '⚡ GENERATE PREDICTION'}
          </button>
        </Card>
      </div>

      {/* ── Bottom grid: API table + Timeline ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Exposed APIs */}
        <Card style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ship size={16} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Exposed Pharma APIs
              </span>
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {affected.length} NODES TRACKED
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
                  {['API Name', 'Dependency', 'Risk', 'Days'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affected.map((a, i) => (
                  <tr key={a.id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text)' }}>{a.name}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 40, height: 4, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${a.import_dependency * 100}%`, height: '100%', background: a.import_dependency > 0.85 ? '#ef4444' : '#f59e0b', borderRadius: 4 }} />
                        </div>
                        {(a.import_dependency * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}><StatusBadge status={a.stock_status} /></td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: a.days_to_shortage <= 30 ? '#ef4444' : 'var(--muted)', fontWeight: a.days_to_shortage <= 30 ? 700 : 400 }}>
                      {a.days_to_shortage}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Timeline */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Clock size={16} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Crisis Timeline</span>
          </div>

          <div style={{ position: 'relative', paddingLeft: 26 }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: 'var(--border)' }} />

            {timeline.map((item, idx) => (
              <div key={idx} style={{ position: 'relative', marginBottom: idx < timeline.length - 1 ? 22 : 0 }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: -26 + 1, top: 4,
                  width: 13, height: 13, borderRadius: '50%',
                  background: 'var(--surface)', border: '2px solid var(--primary)',
                  zIndex: 2,
                }} />
                <div style={{ fontSize: '0.6rem', fontFamily: 'var(--mono)', color: 'var(--primary)', fontWeight: 800, marginBottom: 3, letterSpacing: '0.06em' }}>
                  {item.date} · <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{item.event}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20, padding: '14px 16px',
            background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Info size={14} style={{ color: 'var(--primary)', marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>
              Diversion around the Cape of Good Hope adds <strong style={{ color: 'var(--text)' }}>12–14 days</strong> to India-EU pharmaceutical shipments. Insurance premiums up 400%.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
