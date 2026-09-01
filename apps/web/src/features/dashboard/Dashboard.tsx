import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  DashboardDto,
  DashboardSummaryDto,
  TradingAccountDto
} from '@trading-cockpit/contracts';
import { Button } from '@/components/ui/button';
import {
  DataPanel,
  ErrorState,
  Eyebrow,
  LoadingState,
  PageActions,
  PageHeader,
  PageShell,
  PageSubtitle,
  PageTitle,
  TableSummary,
  UpdatedAt
} from '@/components/ui/cockpit';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';

interface DashboardProps {
  gateway: CockpitGateway;
}

interface DashboardState {
  dashboard: DashboardDto | null;
  accounts: TradingAccountDto[];
  loading: boolean;
  error: string | null;
}

const GLOBAL_METRICS: Array<{
  value: (dashboard: DashboardDto) => number;
  label: string;
  detail: string;
}> = [
  {
    value: (dashboard) => dashboard.summary.signals,
    label: 'Signals',
    detail: 'Latest momentum snapshot'
  },
  {
    value: (dashboard) => dashboard.summary.watchlist,
    label: 'Watchlist',
    detail: 'Tracked candidates'
  },
  {
    value: (dashboard) => dashboard.summary.ready,
    label: 'Ready',
    detail: 'Candidates ready to plan'
  },
  {
    value: (dashboard) => dashboard.pipeline.nearBreakout,
    label: 'Near breakout',
    detail: 'Candidates approaching trigger'
  }
];

const ACCOUNT_METRICS: Array<{ key: keyof DashboardSummaryDto; label: string; detail: string }> = [
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

function DashboardMetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="relative min-h-[160px] overflow-hidden rounded-[14px] border border-[#1d3045] bg-[linear-gradient(145deg,rgba(18,32,50,0.92),rgba(11,23,38,0.9))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:-translate-y-px hover:border-[#2c4b56]">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#4ee1a0,transparent_70%)]" />
      <p className="mb-[18px] text-[11px] font-extrabold tracking-[0.12em] text-[#8393a9] uppercase">
        {label}
      </p>
      <strong className="mb-3 block text-[42px] tracking-[-0.05em] text-[#f5f8fc] tabular-nums">
        {value}
      </strong>
      <span className="text-[11px] text-[#60728b]">{detail}</span>
    </article>
  );
}

function DetailPanel({
  title,
  children,
  action
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <DataPanel aria-label={title}>
      <TableSummary>
        <span>{title}</span>
        {action}
      </TableSummary>
      {children}
    </DataPanel>
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
    accounts: [],
    loading: true,
    error: null
  });
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [dashboard, accounts] = await Promise.all([
        gateway.getDashboard({ accountId: selectedAccountId || null }),
        gateway.getTradingAccounts()
      ]);
      setState({ dashboard, accounts: accounts.accounts, loading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }, [gateway, selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dashboard = state.dashboard;
  const currency = dashboard?.account.currency || 'USD';
  const scopeLabel =
    selectedAccountId === ''
      ? 'All Accounts'
      : state.accounts.find((account) => account.id === selectedAccountId)?.name ||
        selectedAccountId;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Trading overview</Eyebrow>
          <PageTitle>Dashboard</PageTitle>
          <PageSubtitle>Current workflow, risk pulse and operational actions</PageSubtitle>
        </div>
        <PageActions>
          {dashboard && <UpdatedAt>Updated {formattedTimestamp(dashboard.generatedAt)}</UpdatedAt>}
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </PageActions>
      </PageHeader>

      {state.loading && !dashboard && <LoadingState>Loading cockpit data…</LoadingState>}

      {state.error && (
        <ErrorState title="Dashboard unavailable" error={state.error} onRetry={() => void load()} />
      )}

      {dashboard && (
        <div className="space-y-5">
          <DataPanel aria-label="Global market pipeline" className="p-4">
            <div className="mb-4 flex items-end justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
              <div>
                <h2 className="m-0 text-sm font-extrabold tracking-[0.12em] text-[#d7e3f4] uppercase">
                  Market pipeline
                </h2>
                <p className="mt-1.5 mb-0 text-xs text-[#7f8fa6]">
                  Global signal discovery and Watchlist state, independent of account scope.
                </p>
              </div>
            </div>

            <div
              className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[620px]:grid-cols-1"
              aria-label="Global workflow summary"
            >
              {GLOBAL_METRICS.map((metric) => (
                <DashboardMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value(dashboard)}
                  detail={metric.detail}
                />
              ))}
            </div>
          </DataPanel>

          <DataPanel aria-label="Account-scoped Dashboard" className="p-4">
            <div className="mb-4 flex items-end justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start [&_label]:grid [&_label]:gap-[7px] [&_label>span]:text-[9px] [&_label>span]:font-extrabold [&_label>span]:tracking-[0.11em] [&_label>span]:text-[#71869d] [&_label>span]:uppercase [&_select]:min-h-10 [&_select]:min-w-[260px] [&_select]:rounded-lg [&_select]:border [&_select]:border-[#294256] [&_select]:bg-[#0a1826] [&_select]:px-[11px] [&_select]:text-xs [&_select]:text-[#e5edf7] [&_select]:outline-none focus-within:[&_select]:border-[#4ee1a0] focus-within:[&_select]:ring-2 focus-within:[&_select]:ring-[rgba(78,225,160,0.14)] max-[620px]:[&_label]:w-full max-[620px]:[&_select]:w-full">
              <div>
                <h2 className="m-0 text-sm font-extrabold tracking-[0.12em] text-[#d7e3f4] uppercase">
                  Account scope
                </h2>
                <p className="mt-1.5 mb-0 text-xs text-[#7f8fa6]">
                  Trade Plans, Positions, Journal and performance for the selected scope.
                </p>
              </div>
              <label>
                <span>Account Scope</span>
                <select
                  value={selectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  disabled={state.loading && !dashboard}
                >
                  <option value="">All Accounts</option>
                  {state.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.id} — {account.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">
              {ACCOUNT_METRICS.map((metric) => (
                <DashboardMetricCard
                  key={metric.key}
                  label={metric.label}
                  value={dashboard.summary[metric.key]}
                  detail={metric.detail}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
              <DetailPanel title="Performance">
                <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
                  <div>
                    <dt className="text-[#7f8fa6]">Realized Equity</dt>
                    <dd className="m-0 text-xl font-bold">
                      {displayMoney(dashboard.performance.realizedEquity, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#7f8fa6]">Net External Capital</dt>
                    <dd className="m-0 text-xl font-bold">
                      {displayMoney(dashboard.performance.netExternalCapital, currency)}
                    </dd>
                  </div>
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
                    <dt className="text-[#7f8fa6]">Profit Factor</dt>
                    <dd className="m-0 text-xl font-bold">
                      {displayNumber(dashboard.performance.profitFactor)}
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
              </DetailPanel>

              <DetailPanel
                title="Open Position Actions"
                action={
                  <small className="rounded-full border border-[#2f5f52] px-3 py-1 text-[10px] font-bold tracking-[0.1em] text-[#69f0ae] uppercase">
                    {dashboard.actions.openPositions.length} active
                  </small>
                }
              >
                <div className="grid grid-cols-1 text-center text-sm">
                  <div className="p-5">
                    <strong className="block text-2xl">
                      {dashboard.actions.openPositions.length}
                    </strong>
                    <span className="text-[#7f8fa6]">Scoped open positions</span>
                  </div>
                </div>
              </DetailPanel>

              <DetailPanel title="Account">
                <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
                  <div>
                    <dt className="text-[#7f8fa6]">Scope</dt>
                    <dd className="m-0 font-bold">{scopeLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-[#7f8fa6]">Currency</dt>
                    <dd className="m-0 font-bold">{dashboard.account.currency || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#7f8fa6]">Accounts</dt>
                    <dd className="m-0 font-bold">{dashboard.account.accountCount ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#7f8fa6]">Realized Equity</dt>
                    <dd className="m-0 font-bold">
                      {displayMoney(dashboard.account.realizedEquity, currency)}
                    </dd>
                  </div>
                </dl>
              </DetailPanel>
            </div>
          </DataPanel>

          <section className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
            <DetailPanel title="Top Momentum">
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
            </DetailPanel>

            <DetailPanel title="Watchlist">
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
            </DetailPanel>

            <DetailPanel title="Open Positions">
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
            </DetailPanel>
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
    </PageShell>
  );
}
