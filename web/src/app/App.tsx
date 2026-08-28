import { useState } from 'react';
import type { CockpitGateway } from '../infrastructure/cockpit-gateway';
import { Dashboard } from '../features/dashboard/Dashboard';
import { Watchlist } from '../features/watchlist/Watchlist';

interface AppProps {
  gateway: CockpitGateway;
  development?: boolean;
}

export function App({ gateway, development = false }: AppProps) {
  const [activePage, setActivePage] = useState<'dashboard' | 'watchlist'>('dashboard');

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
          <button
            type="button"
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            aria-current={activePage === 'dashboard' ? 'page' : undefined}
            onClick={() => setActivePage('dashboard')}
          >
            <span aria-hidden="true">⌁</span>
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-item ${activePage === 'watchlist' ? 'active' : ''}`}
            aria-current={activePage === 'watchlist' ? 'page' : undefined}
            onClick={() => setActivePage('watchlist')}
          >
            <span aria-hidden="true">◉</span>
            Watchlist
          </button>
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
        {activePage === 'dashboard' ? (
          <Dashboard gateway={gateway} />
        ) : (
          <Watchlist gateway={gateway} />
        )}
      </div>
    </div>
  );
}
