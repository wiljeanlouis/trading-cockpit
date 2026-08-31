import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { DashboardDto, DashboardSummaryDto } from '@trading-cockpit/contracts';
import { Button } from '@/components/ui/button';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';

interface DashboardProps {
  gateway: CockpitGateway;
}

interface DashboardState {
  dashboard: DashboardDto | null;
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

function displayNumber(value: number | null | undefined, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function displayMoney(value: number | null | undefined, currency = 'USD'): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
    : '—';
}

function displayPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(value)
    : '—';
}

function Panel({
  title,
  children,
  action
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-[#1d3045] bg-[rgba(11,23,38,0.76)] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#1d3045] px-5 py-4">
        <h2 className="m-0 text-sm font-extrabold tracking-[0.12em] text-[#d7e3f4] uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CompactRows({
  rows,
  empty,
  render
}: {
  rows: unknown[];
  empty: string;
  render: (row: unknown, index: number) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return <p className="m-0 px-5 py-5 text-sm text-[#7f8fa6]">{empty}</p>;
  }
  return <div className="divide-y divide-[#1d3045]">{rows.map(render)}</div>;
}

export function Dashboard({ gateway }: DashboardProps) {
  const [state, setState] = useState<DashboardState>({
    dashboard: null,
    loading: true,
    error: null
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const dashboard = await gateway.getDashboard();
      setState({ dashboard, loading: false, error: null });
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

  const dashboard = state.dashboard;
  const currency = dashboard?.account.currency || 'USD';

  return (
    <main className="mx-auto max-w-[1260px] px-12 pt-12 pb-16 max-[900px]:px-[26px] max-[900px]:py-9">
      <header className="mb-[38px] flex items-end justify-between gap-8 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className="mb-2 text-[10px] font-extrabold tracking-[0.18em] text-[#4ee1a0] uppercase">
            Trading overview
          </p>
          <h1 className="mb-2 text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em]">
            Dashboard
          </h1>
          <p className="m-0 text-sm text-[#7f8fa6]">
            Current workflow, risk pulse and operational actions
          </p>
        </div>
        <div className="flex items-center gap-4 max-[620px]:flex-col max-[620px]:items-start">
          {dashboard && (
            <p className="m-0 text-[11px] text-[#6f8098]">
              Updated {formattedTimestamp(dashboard.generatedAt)}
            </p>
          )}
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </div>
      </header>

      {state.loading && !dashboard && (
        <section
          className="flex min-h-[220px] items-center justify-center gap-3 rounded-[14px] border border-[#1c3045] bg-[rgba(11,23,38,0.75)] text-[#8495ac]"
          aria-live="polite"
        >
          <span
            className="size-[18px] animate-spin rounded-full border-2 border-[#27413f] border-t-[#4ee1a0]"
            aria-hidden="true"
          />
          Loading cockpit data…
        </section>
      )}

      {state.error && (
        <section
          className="flex min-h-[220px] items-center justify-between gap-3 rounded-[14px] border border-[#61343a] bg-[rgba(61,23,31,0.45)] p-6 text-[#ffb9b9]"
          role="alert"
        >
          <div>
            <strong>Dashboard unavailable</strong>
            <p className="mt-1.5 mb-0 text-[#bd8a90]">{state.error}</p>
          </div>
          <Button variant="retry" onClick={() => void load()}>
            Try again
          </Button>
        </section>
      )}

      {dashboard && (
        <div className="space-y-5">
          <section
            className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1"
            aria-label="Trading workflow summary"
          >
            {METRICS.map((metric) => (
              <article
                className="relative min-h-[160px] overflow-hidden rounded-[14px] border border-[#1d3045] bg-[linear-gradient(145deg,rgba(18,32,50,0.92),rgba(11,23,38,0.9))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:-translate-y-px hover:border-[#2c4b56]"
                key={metric.key}
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#4ee1a0,transparent_70%)]" />
                <p className="mb-[18px] text-[11px] font-extrabold tracking-[0.12em] text-[#8393a9] uppercase">
                  {metric.label}
                </p>
                <strong className="mb-3 block text-[42px] tracking-[-0.05em] text-[#f5f8fc] tabular-nums">
                  {dashboard.summary[metric.key]}
                </strong>
                <span className="text-[11px] text-[#60728b]">{metric.detail}</span>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
            <Panel title="Performance">
              <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
                <div>
                  <dt className="text-[#7f8fa6]">Realized P&L</dt>
                  <dd className="m-0 text-xl font-bold text-[#4ee1a0]">
                    {displayMoney(dashboard.performance.realizedPnl, currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7f8fa6]">Win Rate</dt>
                  <dd className="m-0 text-xl font-bold">
                    {displayPercent(dashboard.performance.winRate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7f8fa6]">Average R</dt>
                  <dd className="m-0 text-xl font-bold">
                    {displayNumber(dashboard.performance.averageR)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7f8fa6]">Total R</dt>
                  <dd className="m-0 text-xl font-bold">
                    {displayNumber(dashboard.performance.totalR)}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel
              title="Action Required"
              action={
                <span className="rounded-full border border-[#2f5f52] px-3 py-1 text-[10px] font-bold tracking-[0.1em] text-[#69f0ae] uppercase">
                  {dashboard.pipeline.nearBreakout + dashboard.actions.ready.length} active
                </span>
              }
            >
              <div className="grid grid-cols-3 divide-x divide-[#1d3045] text-center text-sm">
                <div className="p-5">
                  <strong className="block text-2xl">
                    {dashboard.actions.nearBreakout.length}
                  </strong>
                  <span className="text-[#7f8fa6]">Near breakout</span>
                </div>
                <div className="p-5">
                  <strong className="block text-2xl">{dashboard.actions.ready.length}</strong>
                  <span className="text-[#7f8fa6]">Ready</span>
                </div>
                <div className="p-5">
                  <strong className="block text-2xl">
                    {dashboard.actions.openPositions.length}
                  </strong>
                  <span className="text-[#7f8fa6]">Open</span>
                </div>
              </div>
            </Panel>

            <Panel title="Account">
              <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
                <div>
                  <dt className="text-[#7f8fa6]">Account</dt>
                  <dd className="m-0 font-bold">{dashboard.account.accountName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#7f8fa6]">Currency</dt>
                  <dd className="m-0 font-bold">{dashboard.account.currency || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#7f8fa6]">Risk / Trade</dt>
                  <dd className="m-0 font-bold">
                    {displayPercent(dashboard.account.defaultRiskPercent)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7f8fa6]">Max Position</dt>
                  <dd className="m-0 font-bold">
                    {displayPercent(dashboard.account.maxPositionPercent)}
                  </dd>
                </div>
              </dl>
            </Panel>
          </section>

          <section className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
            <Panel title="Top Momentum">
              <CompactRows
                rows={dashboard.topMomentum}
                empty="No ranked candidates."
                render={(row) => {
                  const candidate = row as DashboardDto['topMomentum'][number];
                  return (
                    <div
                      className="grid grid-cols-[52px_1fr_auto] items-center gap-4 px-5 py-4 text-sm"
                      key={`${candidate.rank}-${candidate.ticker}`}
                    >
                      <span className="text-[#7f8fa6]">#{candidate.rank ?? '—'}</span>
                      <strong>{candidate.ticker}</strong>
                      <span className="font-bold text-[#4ee1a0]">
                        {displayNumber(candidate.score, 0)}
                      </span>
                    </div>
                  );
                }}
              />
            </Panel>

            <Panel title="Watchlist">
              <CompactRows
                rows={dashboard.watchlistPreview}
                empty="No active watchlist candidates."
                render={(row) => {
                  const entry = row as DashboardDto['watchlistPreview'][number];
                  return (
                    <div
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 text-sm"
                      key={`${entry.ticker}-${entry.status}`}
                    >
                      <strong>{entry.ticker}</strong>
                      <span className="text-[#9fb0c6]">
                        {displayMoney(entry.currentPrice, currency)}
                      </span>
                      <span className="rounded-full border border-[#2a3c55] px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-[#9fb0c6] uppercase">
                        {entry.status}
                      </span>
                    </div>
                  );
                }}
              />
            </Panel>

            <Panel title="Open Positions">
              <CompactRows
                rows={dashboard.openPositionsPreview}
                empty="No open positions."
                render={(row) => {
                  const position = row as DashboardDto['openPositionsPreview'][number];
                  return (
                    <div
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 text-sm"
                      key={position.ticker}
                    >
                      <strong>{position.ticker}</strong>
                      <span className="text-[#9fb0c6]">
                        {displayMoney(position.currentPrice, currency)}
                      </span>
                      <span className="font-bold text-[#4ee1a0]">
                        {displayPercent(position.unrealizedPnlPercent)}
                      </span>
                    </div>
                  );
                }}
              />
            </Panel>
          </section>

          <section className="mt-5 flex items-center justify-between gap-7 rounded-[14px] border border-[#1b2b3f] bg-[rgba(10,22,37,0.72)] px-7 py-[26px] max-[900px]:flex-col max-[900px]:items-start">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[0.18em] text-[#4ee1a0] uppercase">
                Workflow pulse
              </p>
              <h2 className="m-0 text-xl font-bold">From signal to closed trade</h2>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-[#8da0b8] max-[620px]:flex-wrap">
              <span>Signals</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Watchlist</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Plans</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Positions</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Journal</span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
