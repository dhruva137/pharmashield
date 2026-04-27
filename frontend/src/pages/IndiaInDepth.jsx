import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const INDIA_STATES = [
  { id: 'MH', name: 'Maharashtra',   port: 'JNPT Mumbai',       pharma_hubs: ['Mumbai','Pune','Nashik'],      api_units: 142, risk: 68, dependency: 'HIGH',   top_input: 'Hydroxychloroquine API', imports_from: ['China','USA','Germany'] },
  { id: 'GJ', name: 'Gujarat',       port: 'Mundra / Kandla',   pharma_hubs: ['Ahmedabad','Vadodara','Ankleshwar'], api_units: 118, risk: 72, dependency: 'CRITICAL', top_input: 'Bulk APIs', imports_from: ['China','Indonesia','Vietnam'] },
  { id: 'TN', name: 'Tamil Nadu',    port: 'Chennai Port',      pharma_hubs: ['Chennai','Puducherry'],        api_units: 87,  risk: 55, dependency: 'HIGH',   top_input: 'Paracetamol API',          imports_from: ['China','Singapore'] },
  { id: 'KA', name: 'Karnataka',     port: 'New Mangalore',     pharma_hubs: ['Bangalore','Hubli'],           api_units: 64,  risk: 42, dependency: 'MEDIUM', top_input: 'Oncology APIs',            imports_from: ['USA','Germany'] },
  { id: 'AP', name: 'Andhra Pradesh',port: 'Visakhapatnam',     pharma_hubs: ['Hyderabad','Vizag'],           api_units: 95,  risk: 61, dependency: 'HIGH',   top_input: 'Penicillin derivatives',   imports_from: ['China','Netherlands'] },
  { id: 'HP', name: 'Himachal Pradesh',port:'N/A (land route)', pharma_hubs: ['Baddi','Solan'],              api_units: 53,  risk: 38, dependency: 'MEDIUM', top_input: 'Formulation APIs',         imports_from: ['China','Germany'] },
  { id: 'WB', name: 'West Bengal',   port: 'Kolkata / Haldia',  pharma_hubs: ['Kolkata','Durgapur'],          api_units: 44,  risk: 47, dependency: 'MEDIUM', top_input: 'Antibiotic APIs',          imports_from: ['China','Bangladesh route'] },
  { id: 'UP', name: 'Uttar Pradesh', port: 'Inland via Mumbai', pharma_hubs: ['Lucknow','Ghaziabad'],         api_units: 38,  risk: 52, dependency: 'HIGH',   top_input: 'Generic drug APIs',        imports_from: ['China','Vietnam'] },
];

const SUPPLY_INPUTS = [
  { name: 'Paracetamol API',          china_dep: 89, alt_source: 'Vietnam', stockpile_days: 42, risk_score: 82, sector: 'pharma' },
  { name: 'Penicillin G',             china_dep: 76, alt_source: 'Netherlands', stockpile_days: 28, risk_score: 71, sector: 'pharma' },
  { name: 'Hydroxychloroquine API',   china_dep: 92, alt_source: 'India domestic', stockpile_days: 15, risk_score: 91, sector: 'pharma' },
  { name: 'Ibuprofen API',            china_dep: 84, alt_source: 'Germany', stockpile_days: 33, risk_score: 77, sector: 'pharma' },
  { name: 'Nickel ore (battery)',      china_dep: 12, alt_source: 'Indonesia', stockpile_days: 60, risk_score: 61, sector: 'rare_earth' },
  { name: 'Rare Earth Oxides (REO)',  china_dep: 95, alt_source: 'None viable', stockpile_days: 8, risk_score: 95, sector: 'rare_earth' },
  { name: 'Ciprofloxacin API',        china_dep: 68, alt_source: 'India domestic', stockpile_days: 55, risk_score: 58, sector: 'pharma' },
  { name: 'Atorvastatin API',         china_dep: 71, alt_source: 'USA', stockpile_days: 22, risk_score: 69, sector: 'pharma' },
];

const RISK_COLOR = (r) => r >= 80 ? '#ef4444' : r >= 60 ? '#f59e0b' : r >= 40 ? '#3b82f6' : '#10b981';
const DEP_COLOR  = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#10b981' };

function RiskBar({ value }) {
  const color = RISK_COLOR(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 2 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', color, fontWeight: 700, minWidth: 28 }}>{value}</span>
    </div>
  );
}

function Tag({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 7px', borderRadius: 3,
      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', fontFamily: 'var(--mono)',
      background: color + '18', color, border: `1px solid ${color}35`,
    }}>{label}</span>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 2 }}>{title}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{sub}</div>}
    </div>
  );
}

export default function IndiaInDepth() {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState(INDIA_STATES[0]);
  const [activeTab, setActiveTab] = useState('states');
  const [shocks, setShocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getShocks({ limit: 20 })
      .then(s => setShocks(Array.isArray(s) ? s.filter(x => x.sector === 'pharma').slice(0, 6) : []))
      .catch(() => setShocks([]))
      .finally(() => setLoading(false));
  }, []);

  const TABS = [
    { id: 'states',  label: 'STATE EXPOSURE' },
    { id: 'inputs',  label: 'CRITICAL INPUTS' },
    { id: 'shocks',  label: 'LIVE SHOCKS' },
  ];

  return (
    <div style={{ padding: '24px 32px', animation: 'fade-in 0.3s ease', maxWidth: 1400 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>India In-Depth</h1>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--mono)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', textTransform: 'uppercase' }}>
              PROCUREMENT INTELLIGENCE
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0, lineHeight: 1.6, maxWidth: 580 }}>
            State-level pharma manufacturing exposure, critical input dependency mapping, and live shock propagation across Indian supply nodes.
          </p>
        </div>
        <button onClick={() => navigate('/map')} style={{
          padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border2)',
          background: 'transparent', color: 'var(--muted)', fontSize: '0.75rem',
          fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--mono)',
        }}>BACK TO MAP</button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total API Manufacturing Units', value: INDIA_STATES.reduce((s, x) => s + x.api_units, 0), color: 'var(--primary)' },
          { label: 'States at HIGH+ Risk',          value: INDIA_STATES.filter(s => s.dependency !== 'MEDIUM' && s.dependency !== 'LOW').length, color: '#ef4444' },
          { label: 'Avg China Dependency',          value: Math.round(SUPPLY_INPUTS.reduce((s, x) => s + x.china_dep, 0) / SUPPLY_INPUTS.length) + '%', color: '#f59e0b' },
          { label: 'Critical Inputs Tracked',       value: SUPPLY_INPUTS.length, color: 'var(--purple)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: k.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '9px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--mono)',
            color: activeTab === t.id ? 'var(--text)' : 'var(--muted)',
            borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: STATE EXPOSURE ── */}
      {activeTab === 'states' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* State table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr 1fr 90px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {['State / Port', 'Top Dependency', 'API Units', 'Risk Score', 'Status'].map(h => (
                <span key={h} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{h}</span>
              ))}
            </div>
            {INDIA_STATES.map(state => {
              const isSel = selectedState?.id === state.id;
              return (
                <div key={state.id} onClick={() => setSelectedState(state)} style={{
                  display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr 1fr 90px',
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: isSel ? 'rgba(59,130,246,0.06)' : 'transparent',
                  borderLeft: isSel ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.12s',
                }}
                  onMouseEnter={e => !isSel && (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => !isSel && (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{state.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 1 }}>{state.port}</div>
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', alignSelf: 'center' }}>{state.top_input}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', alignSelf: 'center' }}>{state.api_units}</div>
                  <div style={{ alignSelf: 'center' }}><RiskBar value={state.risk} /></div>
                  <div style={{ alignSelf: 'center' }}><Tag label={state.dependency} color={DEP_COLOR[state.dependency]} /></div>
                </div>
              );
            })}
          </div>

          {/* State detail panel */}
          {selectedState && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px' }}>
              <SectionHeader title={selectedState.name} sub={`${selectedState.port} entry point`} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'API Units',   value: selectedState.api_units },
                  { label: 'Risk Score',  value: selectedState.risk, color: RISK_COLOR(selectedState.risk) },
                  { label: 'Dependency', value: selectedState.dependency, color: DEP_COLOR[selectedState.dependency] },
                  { label: 'Pharma Hubs', value: selectedState.pharma_hubs.length },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: m.color || 'var(--text)', fontFamily: 'var(--mono)' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 8 }}>Manufacturing Hubs</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedState.pharma_hubs.map(h => (
                    <span key={h} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 4, background: 'var(--surface3)', border: '1px solid var(--border2)', color: 'var(--text)' }}>{h}</span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 8 }}>Import Sources</div>
                {selectedState.imports_from.map((src, i) => (
                  <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < selectedState.imports_from.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.76rem', color: 'var(--text)' }}>{src}</span>
                    {i === 0 && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#ef4444', fontWeight: 700, fontFamily: 'var(--mono)' }}>PRIMARY</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6 }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 4 }}>Critical Input</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{selectedState.top_input}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CRITICAL INPUTS ── */}
      {activeTab === 'inputs' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            {['Input Name', 'China Dependency', 'Alt Source', 'Stockpile (days)', 'Risk'].map(h => (
              <span key={h} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{h}</span>
            ))}
          </div>
          {[...SUPPLY_INPUTS].sort((a, b) => b.risk_score - a.risk_score).map(inp => (
            <div key={inp.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{inp.name}</div>
                <Tag label={inp.sector === 'rare_earth' ? 'Rare Earth' : 'Pharma'} color={inp.sector === 'rare_earth' ? 'var(--purple)' : 'var(--primary)'} />
              </div>
              <div style={{ alignSelf: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: inp.china_dep > 80 ? '#ef4444' : inp.china_dep > 60 ? '#f59e0b' : 'var(--text)', fontFamily: 'var(--mono)' }}>{inp.china_dep}%</div>
                <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, marginTop: 4, width: 60 }}>
                  <div style={{ width: `${inp.china_dep}%`, height: '100%', background: inp.china_dep > 80 ? '#ef4444' : '#f59e0b', borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ fontSize: '0.73rem', color: inp.alt_source === 'None viable' ? '#ef4444' : 'var(--text-dim)', alignSelf: 'center' }}>{inp.alt_source}</div>
              <div style={{ fontSize: '0.82rem', fontFamily: 'var(--mono)', fontWeight: 600, color: inp.stockpile_days < 20 ? '#ef4444' : inp.stockpile_days < 40 ? '#f59e0b' : 'var(--green)', alignSelf: 'center' }}>{inp.stockpile_days}d</div>
              <div style={{ alignSelf: 'center' }}><RiskBar value={inp.risk_score} /></div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: LIVE SHOCKS ── */}
      {activeTab === 'shocks' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8 }} />)}
            </div>
          ) : shocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: '0.82rem' }}>
              No pharma shocks in current feed
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shocks.map(s => {
                const scolor = s.severity === 'CRITICAL' ? '#ef4444' : s.severity === 'HIGH' ? '#f59e0b' : '#3b82f6';
                return (
                  <div key={s.id} style={{
                    background: 'var(--surface)', border: `1px solid var(--border)`,
                    borderLeft: `3px solid ${scolor}`, borderRadius: 8,
                    padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 16,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <Tag label={s.severity} color={scolor} />
                        {s.province && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{s.province}</span>}
                      </div>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.45 }}>{s.title}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                        {new Date(s.detected_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
