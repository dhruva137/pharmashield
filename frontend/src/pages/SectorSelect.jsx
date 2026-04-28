/* Sector selection — Screen 1 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function SectorSelect({ onSelect }) {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState([]);
  const [selected, setSelected] = useState(new Set(['pharma', 'rare_earth', 'energy']));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSectors()
      .then(s => setSectors(s))
      .catch(() => {
        // Fallback static list
        setSectors([
          { id: 'pharma', name: 'Pharma', icon: '💊', status: 'active', input_count: 20, description: 'API & essential medicines', active_shocks: 0, criticality_avg: 0.78 },
          { id: 'rare_earth', name: 'Rare Earths', icon: '⛏️', status: 'active', input_count: 8, description: 'Critical minerals for EV & defence', active_shocks: 0, criticality_avg: 0.83 },
          { id: 'energy', name: 'Energy & Oil', icon: '⛽', status: 'active', input_count: 6, description: 'Crude oil, LNG, refining & fuel security', active_shocks: 3, criticality_avg: 0.91 },
          { id: 'semiconductor', name: 'Semiconductor', icon: '💻', status: 'phase2', input_count: 0, description: 'Chip substrates, fab chemicals', active_shocks: 0, criticality_avg: 0 },
          { id: 'solar', name: 'Solar Energy', icon: '☀️', status: 'phase2', input_count: 0, description: 'Polysilicon, solar wafers', active_shocks: 0, criticality_avg: 0 },
          { id: 'ev_battery', name: 'EV Battery', icon: '🔋', status: 'phase2', input_count: 0, description: 'Lithium, cobalt, cathode materials', active_shocks: 0, criticality_avg: 0 },
          { id: 'defence', name: 'Defence Inputs', icon: '🛡️', status: 'phase2', input_count: 0, description: 'Titanium, tungsten, specialty alloys', active_shocks: 0, criticality_avg: 0 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(id, isActive) {
    if (!isActive) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleContinue() {
    const arr = Array.from(selected);
    onSelect(arr);
    navigate('/dashboard');
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '80px 24px',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,156,249,0.07) 0%, transparent 70%)', zIndex: 0 }} />

      <div style={{ width: '100%', maxWidth: 700, zIndex: 1 }}>
        {/* Back */}
        <button className="btn btn-ghost" style={{ marginBottom: 40, fontSize: '0.8rem' }} onClick={() => navigate('/')}>
          ← Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 12 }}>
            Select Sectors to Monitor
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            You can switch anytime from the dashboard. MVP has Pharma + Rare Earths live.
          </p>
        </div>

        {loading ? (
          <div className="grid-3" style={{ marginBottom: 40 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
          </div>
        ) : (
          <div className="grid-3" style={{ marginBottom: 40 }}>
            {sectors.map(s => {
              const isActive = s.status === 'active';
              const isSel = selected.has(s.id);
              return (
                <div
                  key={s.id}
                  id={`sector-card-${s.id}`}
                  onClick={() => toggle(s.id, isActive)}
                  style={{
                    background: isSel ? 'rgba(79,156,249,0.08)' : 'var(--surface)',
                    border: `1px solid ${isSel ? 'rgba(79,156,249,0.4)' : 'var(--border)'}`,
                    borderRadius: 14, padding: '22px 20px',
                    cursor: isActive ? 'pointer' : 'default',
                    opacity: isActive ? 1 : 0.45,
                    transition: 'all 0.2s',
                    position: 'relative',
                    transform: isSel ? 'translateY(-2px)' : 'none',
                    boxShadow: isSel ? '0 0 20px rgba(79,156,249,0.15)' : 'none',
                  }}
                >
                  {isSel && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: '#fff', fontWeight: 700,
                    }}>✓</div>
                  )}
                  {!isActive && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10, fontSize: '0.62rem',
                      background: 'var(--surface2)', color: 'var(--muted)',
                      border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px',
                    }}>Phase 2</div>
                  )}

                  <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 5 }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.4, marginBottom: 10 }}>{s.description}</div>

                  {isActive && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 10px' }}>
                        {s.input_count} inputs
                      </span>
                      {s.active_shocks > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 999, padding: '2px 10px' }}>
                          {s.active_shocks} shocks
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button
            id="btn-continue-sectors"
            className="btn btn-primary"
            style={{ padding: '13px 40px', fontSize: '1rem', opacity: selected.size === 0 ? 0.5 : 1 }}
            disabled={selected.size === 0}
            onClick={handleContinue}
          >
            Continue with {selected.size} sector{selected.size !== 1 ? 's' : ''} →
          </button>
        </div>
      </div>
    </div>
  );
}
