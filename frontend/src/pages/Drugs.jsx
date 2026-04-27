import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, ChevronLeft, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import SeverityBadge from '../components/ui/SeverityBadge';
import RiskBar from '../components/ui/RiskBar';
import Spinner from '../components/ui/Spinner';
import PageHeader from '../components/ui/PageHeader';

function tierLabel(tier) {
  return { TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3' }[tier] || tier;
}

function riskLabel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

// ── Drug Detail ──────────────────────────────────────────────────────────────
function DrugDetail({ id }) {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.getDrug(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center p-16"><Spinner size="lg" /></div>;
  if (error)   return <div className="p-8 text-accent text-sm">Error: {error}</div>;
  if (!data)   return null;

  const { drug, dependency_chain, supplier_hhi, criticality_breakdown, recent_alerts, current_risk } = data;

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', animation: 'fade-in 0.3s ease' }}>
      <button onClick={() => navigate('/drugs')} className="btn btn-ghost" style={{ marginBottom: '24px', fontSize: '0.8rem' }}>
        <ChevronLeft style={{ width: '16px', height: '16px' }} /> Back to drugs
      </button>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0' }}>{drug.name}</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>{drug.generic_name} · {drug.therapeutic_class}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <SeverityBadge severity={riskLabel(current_risk || 0)} />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '8px' }}>Risk {Math.round(current_risk || 0)}/100</p>
          </div>
        </div>
        <div style={{ marginTop: '20px' }}>
          <RiskBar score={current_risk || 0} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'NLEM Tier',       value: tierLabel(drug.nlem_tier) },
          { label: 'Substitute',      value: drug.has_substitute ? 'Yes' : 'No' },
          { label: 'Supplier HHI',    value: supplier_hhi?.toFixed(0) ?? 'N/A' },
          { label: 'Patients Est.',   value: drug.patient_population_estimate
              ? `${(drug.patient_population_estimate / 1e6).toFixed(0)}M`
              : 'N/A' },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: '16px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>{label}</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {criticality_breakdown && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px 0' }}>Criticality Breakdown</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(criticality_breakdown)
              .filter(([k]) => k !== 'final_score')
              .map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', width: '160px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                  <div style={{ flex: 1 }}>
                    <RiskBar score={typeof val === 'number' ? Math.min(100, val) : 0} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {dependency_chain?.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px 0' }}>Supply Chain Path</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {dependency_chain.map((node, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{node.type}: </span>
                  <span style={{ fontWeight: 500 }}>{node.name || node.id}</span>
                </div>
                {i < dependency_chain.length - 1 && <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recent_alerts?.length > 0 && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px 0' }}>Recent Alerts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recent_alerts.map(alert => (
              <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <SeverityBadge severity={alert.severity} />
                <div>
                  <p style={{ fontSize: '0.875rem', margin: '0 0 4px 0', lineHeight: 1.5 }}>{alert.summary}</p>
                  {alert.gemini_explainer && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{alert.gemini_explainer}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Drug List ────────────────────────────────────────────────────────────────
export default function Drugs() {
  const { id } = useParams();
  const [drugs, setDrugs]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tier, setTier]       = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (id) return;
    setLoading(true);
    api.getDrugs({
      tier:     tier || undefined,
      severity: severity || undefined,
      limit:    PAGE_SIZE,
      offset:   (page - 1) * PAGE_SIZE,
    })
      .then(d => { setDrugs(d.drugs || []); setTotal(d.total || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, tier, severity, page]);

  if (id) return <DrugDetail id={id} />;

  const filtered = drugs.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', animation: 'fade-in 0.3s ease' }}>
      <PageHeader
        title="Drug Catalog"
        description={`${total} NLEM essential medicines monitored`}
      />

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search drugs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <select
          value={tier}
          onChange={e => { setTier(e.target.value); setPage(1); }}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="">All Tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>

        <select
          value={severity}
          onChange={e => { setSeverity(e.target.value); setPage(1); }}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="">All Risk Levels</option>
          <option value="critical">Critical (≥80)</option>
          <option value="high">High (60–80)</option>
          <option value="medium">Medium (30–60)</option>
          <option value="low">Low (&lt;30)</option>
        </select>
      </div>

      {error && <p style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Drug', 'Class', 'Tier', 'Risk Score', 'Substitute', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px' }}><Spinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>No drugs match filters</td></tr>
            ) : filtered.map(drug => {
              const risk = drug.current_risk || drug.criticality_score || 0;
              return (
                <tr key={drug.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Link to={`/drugs/${drug.id}`} style={{ fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}>
                      {drug.name}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{drug.therapeutic_class || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px' }}>
                      {tierLabel(drug.nlem_tier)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', width: '160px' }}>
                    <RiskBar score={risk} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: drug.has_substitute ? 'var(--secondary, #10b981)' : 'var(--muted)' }}>
                      {drug.has_substitute ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link to={`/drugs/${drug.id}`} style={{ color: 'var(--muted)' }}>
                      <ExternalLink style={{ width: '14px', height: '14px' }} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.875rem', color: 'var(--muted)' }}>
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="btn btn-ghost"
              style={{ padding: '6px 12px' }}
            >← Prev</button>
            <button
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage(p => p + 1)}
              className="btn btn-ghost"
              style={{ padding: '6px 12px' }}
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
