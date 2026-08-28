import { useCallback, useEffect, useState } from 'react';
import type { DashboardSummaryDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';

interface DashboardProps {
  gateway: CockpitGateway;
}

interface DashboardState {
  summary: DashboardSummaryDto | null;
  loading: boolean;
  error: string | null;
}

const METRICS: Array<{ key: keyof DashboardSummaryDto; label: string; detail: string }> = [
  { key: 'signals', label: 'Signals', detail: 'Latest momentum snapshot' },
  { key: 'watchlist', label: 'Watchlist', detail: 'Tracked candidates' },
  { key: 'ready', label: 'Ready', detail: 'Candidates ready to plan' },
  { key: 'activeTradePlans', label: 'Trade plans', detail: 'Draft or ready' },
  { key: 'openPositions', label: 'Open positions', detail: 'Currently open' },
  { key: 'closedTrades', label: 'Closed trades', detail: 'Journal entries' }
];

function formattedTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function Dashboard({ gateway }: DashboardProps) {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    loading: true,
    error: null
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const summary = await gateway.getDashboardSummary();
      setState({ summary, loading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }, [gateway]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Trading overview</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Live workflow counts from Trading Cockpit</p>
        </div>
        <div className="dashboard-actions">
          {state.summary && (
            <p className="updated-at">Updated {formattedTimestamp(state.summary.generatedAt)}</p>
          )}
          <button
            type="button"
            className="refresh-button"
            onClick={() => void load()}
            disabled={state.loading}
          >
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      {state.loading && !state.summary && (
        <section className="status-panel" aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
          Loading cockpit data…
        </section>
      )}

      {state.error && (
        <section className="status-panel error-panel" role="alert">
          <div>
            <strong>Dashboard unavailable</strong>
            <p>{state.error}</p>
          </div>
          <button type="button" onClick={() => void load()}>
            Try again
          </button>
        </section>
      )}

      {state.summary && (
        <>
          <section className="metric-grid" aria-label="Trading workflow summary">
            {METRICS.map((metric) => (
              <article className="metric-card" key={metric.key}>
                <div className="metric-accent" />
                <p>{metric.label}</p>
                <strong>{state.summary?.[metric.key]}</strong>
                <span>{metric.detail}</span>
              </article>
            ))}
          </section>

          <section className="pipeline-panel">
            <div>
              <p className="eyebrow">Workflow pulse</p>
              <h2>From signal to closed trade</h2>
            </div>
            <div className="pipeline-flow">
              <span>Signals</span>
              <i />
              <span>Watchlist</span>
              <i />
              <span>Plans</span>
              <i />
              <span>Positions</span>
              <i />
              <span>Journal</span>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
