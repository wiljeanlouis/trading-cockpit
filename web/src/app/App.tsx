import type { CockpitGateway } from '../infrastructure/cockpit-gateway';
import { Dashboard } from '../features/dashboard/Dashboard';

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
          <a className="nav-item active" href="#dashboard" aria-current="page">
            <span aria-hidden="true">⌁</span>
            Dashboard
          </a>
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
        <Dashboard gateway={gateway} />
      </div>
    </div>
  );
}
