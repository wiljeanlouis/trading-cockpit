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
  MetricCard,
  MetricDetailGrid,
  PageActions,
  PageHeader,
  PageShell,
  PageSubtitle,
  PageTitle,
  ScopeBadge,
  ScopeContextBar,
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
        <div className="space-y-4">
          <section className="grid grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] gap-4 max-[980px]:grid-cols-1">
            <DataPanel aria-label="Discovery" className="p-4">
              <div className="mb-4 flex items-end justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
                <div>
                  <h2 className="m-0 text-sm font-extrabold tracking-[0.12em] text-[#d7e3f4] uppercase">
                    Discovery
                  </h2>
                  <p className="mt-1.5 mb-0 text-xs text-[#7f8fa6]">
                    Opportunities discovered and candidates currently tracked.
                  </p>
                </div>
              </div>

              <div
                className="grid grid-cols-2 gap-4 max-[620px]:grid-cols-1"
                aria-label="Global discovery summary"
              >
                {GLOBAL_METRICS.map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value(dashboard)}
                    detail={metric.detail}
                  />
                ))}
              </div>
            </DataPanel>

            <DataPanel aria-label="Account-scoped Dashboard" className="p-4">
              <div className="mb-4 flex items-end justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start [&_label]:grid [&_label]:gap-[7px] [&_label>span]:text-[9px] [&_label>span]:font-extrabold [&_label>span]:tracking-[0.11em] [&_label>span]:text-[#71869d] [&_label>span]:uppercase [&_select]:min-h-10 [&_select]:min-w-[240px] [&_select]:rounded-lg [&_select]:border [&_select]:border-[#294256] [&_select]:bg-[#0a1826] [&_select]:px-[11px] [&_select]:text-xs [&_select]:text-[#e5edf7] [&_select]:outline-none focus-within:[&_select]:border-[#4ee1a0] focus-within:[&_select]:ring-2 focus-within:[&_select]:ring-[rgba(78,225,160,0.14)] max-[620px]:[&_label]:w-full max-[620px]:[&_select]:w-full">
                <div>
                  <h2 className="m-0 text-sm font-extrabold tracking-[0.12em] text-[#d7e3f4] uppercase">
                    Account scope
                  </h2>
                  <p className="mt-1.5 mb-0 text-xs text-[#7f8fa6]">
                    Plans, Positions, Journal and performance for the selected scope.
                  </p>
                </div>
                <label>
                  <select
                    aria-label="Account Scope"
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

              <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
                {ACCOUNT_METRICS.map((metric) => (
                  <MetricCard
                    key={metric.key}
                    label={metric.label}
                    value={dashboard.summary[metric.key]}
                    detail={metric.detail}
                  />
                ))}
              </div>
            </DataPanel>
          </section>

          <DetailPanel title="Scoped Performance" action={<ScopeBadge>{scopeLabel}</ScopeBadge>}>
            <ScopeContextBar>
              <span>Calculated for the selected account scope</span>
              <span className="mx-2 text-[#36506a]">•</span>
              <span>
                Currency <b>{dashboard.account.currency || '—'}</b>
              </span>
              <span className="mx-2 text-[#36506a]">•</span>
              <span>
                Accounts <b>{dashboard.account.accountCount ?? '—'}</b>
              </span>
              {dashboard.account.accountId && (
                <>
                  <span className="mx-2 text-[#36506a]">•</span>
                  <span>
                    Account ID <b>{dashboard.account.accountId}</b>
                  </span>
                </>
              )}
            </ScopeContextBar>
            <MetricDetailGrid>
              <div>
                <dt className="text-[#7f8fa6]">Realized Equity</dt>
                <dd className="m-0 text-lg font-bold">
                  {displayMoney(dashboard.performance.realizedEquity, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[#7f8fa6]">Net External Capital</dt>
                <dd className="m-0 text-lg font-bold">
                  {displayMoney(dashboard.performance.netExternalCapital, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[#7f8fa6]">Realized P&L</dt>
                <dd className="m-0 text-lg font-bold text-[#4ee1a0]">
                  {displayMoney(dashboard.performance.realizedPnl, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[#7f8fa6]">Win Rate</dt>
                <dd className="m-0 text-lg font-bold">
                  {displayPercent(dashboard.performance.winRate)}
                </dd>
              </div>
              <div>
                <dt className="text-[#7f8fa6]">Profit Factor</dt>
                <dd className="m-0 text-lg font-bold">
                  {displayNumber(dashboard.performance.profitFactor)}
                </dd>
              </div>
              <div>
                <dt className="text-[#7f8fa6]">Average R</dt>
                <dd className="m-0 text-lg font-bold">
                  {displayNumber(dashboard.performance.averageR)}
                </dd>
              </div>
              <div>
                <dt className="text-[#7f8fa6]">Total R</dt>
                <dd className="m-0 text-lg font-bold">
                  {displayNumber(dashboard.performance.totalR)}
                </dd>
              </div>
            </MetricDetailGrid>
          </DetailPanel>

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
                      <div>
                        <strong>{position.ticker}</strong>
                        <span className="mt-1 block text-[11px] text-[#7f8fa6]">
                          Entry {displayMoney(position.actualEntry, currency)} · Stop{' '}
                          {displayMoney(position.currentStop, currency)}
                        </span>
                      </div>
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
        </div>
      )}
    </PageShell>
  );
}
