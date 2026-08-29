import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import type { CockpitGateway } from '../infrastructure/cockpit-gateway';
import { Dashboard } from '../features/dashboard/Dashboard';
import { Watchlist } from '../features/watchlist/Watchlist';
import { TradePlans } from '../features/trade-plans/TradePlans';
import { Positions } from '../features/positions/Positions';

interface AppProps {
  gateway: CockpitGateway;
  development?: boolean;
}

export function App({ gateway, development = false }: AppProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TC</span>
          <div>
            <strong>Trading</strong>
            <span>Cockpit</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <p>Trading</p>
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span aria-hidden="true">⌁</span>
            Dashboard
          </NavLink>
          <NavLink
            to="/watchlist"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span aria-hidden="true">◉</span>
            Watchlist
          </NavLink>
          <NavLink
            to="/trade-plans"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span aria-hidden="true">◇</span>
            Trade Plans
          </NavLink>
          <NavLink
            to="/positions"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span aria-hidden="true">↗</span>
            Positions
          </NavLink>
          <div className="nav-divider" />
          <p>Administration</p>
          <span className="nav-item disabled" aria-disabled="true">
            <span aria-hidden="true">⚙</span>
            Administration
            <small>Later</small>
          </span>
        </nav>

        <div className="sidebar-footer">
          <span className="connection-dot" />
          Apps Script backend
        </div>
      </aside>

      <div className="app-content">
        {development && <div className="development-banner">Development mock data</div>}
        <Routes>
          <Route path="/" element={<Dashboard gateway={gateway} />} />
          <Route path="/watchlist" element={<Watchlist gateway={gateway} />} />
          <Route path="/trade-plans" element={<TradePlans gateway={gateway} />} />
          <Route path="/positions" element={<Positions gateway={gateway} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
