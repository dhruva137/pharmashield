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
    <div className="p-8 space-y-6 max-w-4xl">
      <button onClick={() => navigate('/drugs')} className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to drugs
      </button>

      <div className="bg-surface border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{drug.name}</h1>
            <p className="text-muted text-sm mt-1">{drug.generic_name} · {drug.therapeutic_class}</p>
          </div>
          <div className="text-right">
            <SeverityBadge severity={riskLabel(current_risk || 0)} />
            <p className="text-xs text-muted mt-1">Risk {Math.round(current_risk || 0)}/100</p>
          </div>
        </div>
        <div className="mt-4">
          <RiskBar score={current_risk || 0} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'NLEM Tier',       value: tierLabel(drug.nlem_tier) },
          { label: 'Substitute',      value: drug.has_substitute ? 'Yes' : 'No' },
          { label: 'Supplier HHI',    value: supplier_hhi?.toFixed(0) ?? 'N/A' },
          { label: 'Patients Est.',   value: drug.patient_population_estimate
              ? `${(drug.patient_population_estimate / 1e6).toFixed(0)}M`
              : 'N/A' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-widest">{label}</p>
            <p className="text-lg font-semibold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {criticality_breakdown && (
        <div className="bg-surface border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-medium mb-4">Criticality Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(criticality_breakdown)
              .filter(([k]) => k !== 'final_score')
              .map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-40 capitalize">{key.replace(/_/g, ' ')}</span>
                  <div className="flex-1">
                    <RiskBar score={typeof val === 'number' ? Math.min(100, val) : 0} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {dependency_chain?.length > 0 && (
        <div className="bg-surface border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-medium mb-4">Supply Chain Path</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {dependency_chain.map((node, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-background rounded-lg border border-white/[0.06] text-xs">
                  <span className="text-muted capitalize">{node.type}: </span>
                  <span>{node.name || node.id}</span>
                </div>
                {i < dependency_chain.length - 1 && <span className="text-muted text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recent_alerts?.length > 0 && (
        <div className="bg-surface border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-medium mb-4">Recent Alerts</h2>
          <div className="space-y-3">
            {recent_alerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-background">
                <SeverityBadge severity={alert.severity} />
                <div>
                  <p className="text-sm">{alert.summary}</p>
                  {alert.gemini_explainer && (
                    <p className="text-xs text-muted mt-1">{alert.gemini_explainer}</p>
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
    <div className="p-8">
      <PageHeader
        title="Drug Catalog"
        description={`${total} NLEM essential medicines monitored`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search drugs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm bg-surface border border-white/[0.06] rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary/50 w-52"
          />
        </div>

        <select
          value={tier}
          onChange={e => { setTier(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-surface border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-primary/50"
        >
          <option value="">All Tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>

        <select
          value={severity}
          onChange={e => { setSeverity(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-surface border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-primary/50"
        >
          <option value="">All Risk Levels</option>
          <option value="critical">Critical (≥80)</option>
          <option value="high">High (60–80)</option>
          <option value="medium">Medium (30–60)</option>
          <option value="low">Low (&lt;30)</option>
        </select>
      </div>

      {error && <p className="text-sm text-accent mb-4">{error}</p>}

      {/* Table */}
      <div className="bg-surface border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Drug', 'Class', 'Tier', 'Risk Score', 'Substitute', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-muted font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12"><Spinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted text-sm">No drugs match filters</td></tr>
            ) : filtered.map(drug => {
              const risk = drug.current_risk || drug.criticality_score || 0;
              return (
                <tr key={drug.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/drugs/${drug.id}`} className="font-medium hover:text-primary transition-colors">
                      {drug.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{drug.therapeutic_class || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-white/5 border border-white/10 rounded px-2 py-0.5">
                      {tierLabel(drug.nlem_tier)}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-40">
                    <RiskBar score={risk} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={drug.has_substitute ? 'text-secondary' : 'text-muted'}>
                      {drug.has_substitute ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/drugs/${drug.id}`} className="text-muted hover:text-primary transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
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
        <div className="flex items-center justify-between mt-4 text-sm text-muted">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-surface border border-white/[0.06] disabled:opacity-40 hover:border-primary/50 transition-colors"
            >← Prev</button>
            <button
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-surface border border-white/[0.06] disabled:opacity-40 hover:border-primary/50 transition-colors"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
