import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import ShockMapLogo from './ShockMapLogo';
import NewsTicker from './NewsTicker';

const NAV_SECTIONS = [
  {
    label: 'INTELLIGENCE',
    items: [
      { to: '/dashboard',  label: 'Dashboard',         icon: '▣' },
      { to: '/alerts',     label: 'Live Shocks',       icon: '◎' },
      { to: '/globe',      label: '3D Globe',           icon: '🌐' },
      { to: '/map',        label: 'Supply Map',         icon: '⊕' },
      { to: '/hormuz',     label: 'Hormuz Tracker',    icon: '⚓', color: '#ef4444' },
      { to: '/energy',     label: 'Energy Watch',      icon: '⛽', color: '#f59e0b' },
      { to: '/india',      label: 'India In-Depth',    icon: '◧' },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { to: '/stocks',     label: 'Market Signals',    icon: '📈' },
      { to: '/graph',      label: 'Propagation Graph', icon: '⋯' },
      { to: '/simulate',   label: 'Shock Simulator',   icon: '◈' },
      { to: '/query',      label: 'Ask ShockMap',       icon: '◉' },
      { to: '/drugs',      label: 'Input Registry',     icon: '≡' },
      { to: '/backtest',   label: 'COVID Backtest',     icon: '◁' },
      { to: '/faq',        label: 'FAQ & Docs',         icon: '?' },
    ],
  },
];

export default function AppShell({ children, selectedSectors }) {
  const [health, setHealth] = useState(null);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const isLive     = health?.shock_feed_mode === 'live' || !health?.shock_feed_mode;
  const isHybrid   = health?.shock_feed_mode === 'hybrid_demo_live';
  const isDemoOnly = health?.shock_feed_mode === 'demo';

  const feedColor = isLive ? 'var(--green)' : isHybrid ? 'var(--amber)' : 'var(--muted)';
  const feedText  = isHybrid  ? `Hybrid · ${health?.live_shocks || 0} live`
                  : isDemoOnly ? 'Curated scenarios'
                  : 'GDELT · 15 min';

  // Hide ticker & full layout on the Globe page (it's full-screen)
  const isGlobe = location.pathname === '/globe';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
      }}>

        {/* Logo */}
        <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <ShockMapLogo size={34} />
            <div>
              <div style={{
                fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)',
                letterSpacing: '-0.03em', lineHeight: 1.1,
              }}>
                <span style={{ color: 'var(--text)' }}>Shock</span>
                <span style={{ color: 'var(--primary)' }}>Map</span>
              </div>
              <div style={{
                fontSize: '0.55rem', color: 'var(--muted)',
                letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 1,
              }}>
                Intelligence Platform
              </div>
            </div>
          </div>

          {/* Sectors */}
          {selectedSectors?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedSectors.map(s => {
                const bc = s === 'energy' ? 'rgba(245,158,11,0.12)' : s === 'rare_earth' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.1)';
                const fc = s === 'energy' ? '#f59e0b' : s === 'rare_earth' ? '#8b5cf6' : 'var(--primary)';
                const br = s === 'energy' ? 'rgba(245,158,11,0.25)' : s === 'rare_earth' ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.2)';
                return (
                <span key={s} style={{
                  fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px',
                  borderRadius: 3, letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: bc, color: fc, border: `1px solid ${br}`,
                }}>
                  {s === 'rare_earth' ? 'RARE EARTH' : s === 'energy' ? 'ENERGY' : s.toUpperCase()}
                </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: '0.55rem', fontWeight: 800, color: 'var(--muted)',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '4px 8px 8px',
              }}>{section.label}</div>
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 10px', borderRadius: 6, marginBottom: 1,
                  textDecoration: 'none', fontSize: '0.78rem', fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text)' : 'var(--muted)',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all 0.12s',
                })}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: '0.7rem',
                    opacity: item.color ? 1 : 0.65,
                    minWidth: 14,
                    color: item.color || 'inherit',
                  }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User profile */}
        {user ? (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={user.photoURL}
              alt="avatar"
              style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName}
              </div>
              <div style={{ fontSize: '0.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {user.role}
              </div>
            </div>
            <button onClick={logout} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }} title="Logout">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.55 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} style={{ color: 'var(--muted)' }} />
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 500 }}>GUEST SESSION</span>
          </div>
        )}

        {/* Feed status footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span className="live-dot" style={{ background: feedColor }} />
            <span style={{ fontSize: '0.63rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{feedText}</span>
          </div>
          {health?.engines_online != null && (
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginBottom: 8 }}>
              Engines: <span style={{ color: 'var(--green)', fontWeight: 600 }}>{health.engines_online}/3 online</span>
            </div>
          )}
          <button
            onClick={() => { localStorage.removeItem('shockmap_toured'); window.location.reload(); }}
            style={{
              marginBottom: 6, width: '100%', padding: '5px 0',
              background: 'transparent', border: '1px solid var(--border2)',
              borderRadius: 5, color: 'var(--muted)', fontSize: '0.6rem',
              cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,156,249,0.4)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            TAKE TOUR
          </button>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%', padding: '5px 0',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 5, color: 'var(--text)', fontSize: '0.63rem',
              cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {theme === 'dark' ? '☼ LIGHT MODE' : '☾ DARK MODE'}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto' }}>
        {/* Scrolling ticker — hidden on Globe (full-screen) */}
        {!isGlobe && <NewsTicker />}
        <main style={{ flex: 1 }}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
