import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Pill, Bell, Network, MessageSquare, Zap, Shield,
} from 'lucide-react';

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/drugs',    icon: Pill,            label: 'Drugs'       },
  { to: '/alerts',   icon: Bell,            label: 'Alerts'      },
  { to: '/graph',    icon: Network,         label: 'Graph'       },
  { to: '/query',    icon: MessageSquare,   label: 'AI Analyst'  },
  { to: '/simulate', icon: Zap,             label: 'Simulate'    },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-white font-sans">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-surface">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-wide">PharmaShield</span>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.06]">
          <p className="text-xs text-muted/60">MVP · v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
