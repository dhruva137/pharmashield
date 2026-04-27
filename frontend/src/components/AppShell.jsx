import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { api } from '../api/client';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'DB' },
  { to: '/map', label: 'Map View', icon: 'MP' },
  { to: '/alerts', label: 'Live Shocks', icon: 'LS' },
  { to: '/query', label: 'Ask ShockMap', icon: 'AI' },
  { to: '/drugs', label: 'Inputs', icon: 'IN' },
  { to: '/graph', label: 'Graph', icon: 'GR' },
  { to: '/simulate', label: 'Simulate', icon: 'SM' },
];

export default function AppShell({ children, selectedSectors }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const isHybridFeed = health?.shock_feed_mode === 'hybrid_demo_live';
  const isDemoOnly = health?.shock_feed_mode === 'demo';
  const feedText = isHybridFeed
    ? `Hybrid feed | ${health?.live_shocks || 0} live + ${health?.demo_scenarios || 0} scenarios`
    : isDemoOnly
      ? `Curated scenarios | ${health?.demo_scenarios || 0} loaded`
      : 'GDELT live | 15 min';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '0 20px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #4f9cf9, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            SM
          </div>
          <span style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>ShockMap</span>
        </div>

        {selectedSectors && selectedSectors.length > 0 && (
          <div style={{ padding: '0 20px 20px' }}>
            <p
              style={{
                fontSize: '0.65rem',
                color: 'var(--muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Monitoring
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedSectors.map((sector) => (
                <span
                  key={sector}
                  style={{
                    fontSize: '0.7rem',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'rgba(79,156,249,0.1)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(79,156,249,0.25)',
                  }}
                >
                  {sector === 'rare_earth' ? 'Rare Earths' : sector.charAt(0).toUpperCase() + sector.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ width: '100%', height: 1, background: 'var(--border)', marginBottom: 12 }} />

        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 12px',
                borderRadius: 9,
                marginBottom: 3,
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isActive ? 'var(--primary)' : 'var(--muted)',
                background: isActive ? 'rgba(79,156,249,0.1)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 16 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', color: 'var(--muted)' }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            {feedText}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {children || <Outlet />}
      </main>
    </div>
  );
}
