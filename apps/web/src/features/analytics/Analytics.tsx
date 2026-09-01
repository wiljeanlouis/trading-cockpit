import { useCallback, useEffect, useState } from 'react';
import type { AnalyticsDto, TradingAccountDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { Button } from '@/components/ui/button';
import {
  DataPanel,
  EmptyState,
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
  TableScroll,
  TableSummary,
  UpdatedAt,
  tableDetailClassName
} from '@/components/ui/cockpit';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface AnalyticsProps {
  gateway: CockpitGateway;
}

interface AnalyticsState {
  data: AnalyticsDto | null;
  accounts: TradingAccountDto[];
  loading: boolean;
  error: string | null;
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(
    value
  );
}

function formatMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

function strategyRowClassName(row: number): string {
  return row % 2 === 0 ? 'bg-[rgba(255,255,255,0.01)]' : '';
}

function monetaryTone(value: number): string | undefined {
  if (value > 0) return 'text-[#79e9b4]';
  if (value < 0) return 'text-[#ff9da8]';
  return undefined;
}

export function Analytics({ gateway }: AnalyticsProps) {
  const [state, setState] = useState<AnalyticsState>({
    data: null,
    accounts: [],
    loading: true,
    error: null
  });
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [data, accounts] = await Promise.all([
        gateway.getAnalytics({
          accountId: selectedAccountId || null,
          strategyId: selectedStrategyId || null
        }),
        gateway.getTradingAccounts()
      ]);
      setState({ data, accounts: accounts.accounts, loading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }, [gateway, selectedAccountId, selectedStrategyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    if (state.loading) return;
    await load();
  }

  const data = state.data;
  const strategyOptions = data?.byStrategy ?? [];
  const selectedStrategyName =
    strategyOptions.find((strategy) => strategy.strategyId === selectedStrategyId)?.strategy ??
    selectedStrategyId;
  const scopeLabel =
    selectedAccountId === ''
      ? 'All Accounts'
      : state.accounts.find((account) => account.id === selectedAccountId)?.name ||
        selectedAccountId;
  const selectedAccount = state.accounts.find((account) => account.id === selectedAccountId);

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Trading review</Eyebrow>
          <PageTitle>Analytics</PageTitle>
          <PageSubtitle>Backend-confirmed Journal metrics and strategy breakdowns</PageSubtitle>
        </div>
        <PageActions>
          {data && <UpdatedAt>Updated {new Date(data.generatedAt).toLocaleString()}</UpdatedAt>}
          <Button onClick={() => void refresh()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </PageActions>
      </PageHeader>

      <section
        className="mb-4 grid grid-cols-[repeat(2,minmax(220px,360px))] items-end gap-3 rounded-xl border border-[#1c3447] bg-[rgba(10,24,39,0.82)] p-4 max-[620px]:grid-cols-1 [&_label]:grid [&_label]:gap-[7px] [&_label>span]:text-[9px] [&_label>span]:font-extrabold [&_label>span]:tracking-[0.11em] [&_label>span]:text-[#71869d] [&_label>span]:uppercase [&_select]:min-h-10 [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:border-[#294256] [&_select]:bg-[#0a1826] [&_select]:px-[11px] [&_select]:text-xs [&_select]:text-[#e5edf7] [&_select]:outline-none focus-within:[&_select]:border-[#4ee1a0] focus-within:[&_select]:ring-2 focus-within:[&_select]:ring-[rgba(78,225,160,0.14)]"
        aria-label="Analytics filters"
      >
        <label>
          <span>Account Scope</span>
          <select
            aria-label="Account Scope"
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            disabled={state.loading && !data}
          >
            <option value="">All Accounts</option>
            {state.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.id} — {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Strategy</span>
          <select
            aria-label="Strategy"
            value={selectedStrategyId}
            onChange={(event) => setSelectedStrategyId(event.target.value)}
            disabled={state.loading && !data}
          >
            <option value="">All Strategies</option>
            {selectedStrategyId && strategyOptions.length === 0 && (
              <option value={selectedStrategyId}>{selectedStrategyName}</option>
            )}
            {strategyOptions.map((strategy) => (
              <option key={strategy.strategyId} value={strategy.strategyId}>
                {strategy.strategy}
              </option>
            ))}
          </select>
        </label>
      </section>

      {state.loading && !data && <LoadingState>Loading analytics…</LoadingState>}

      {state.error && (
        <ErrorState title="Analytics unavailable" error={state.error} onRetry={() => void load()} />
      )}

      {data && !data.available && !state.error && (
        <EmptyState icon="▦" title="Analytics not ready">
          Journal data is not available yet.
        </EmptyState>
      )}

      {data && data.available && (
        <div className="grid gap-4">
          <section
            className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1"
            aria-label="Analytics summary"
          >
            <MetricCard label="Trades" value={String(data.summary.trades)} detail="Closed trades" />
            <MetricCard
              label="Win Rate"
              value={formatPercent(data.summary.winRate)}
              detail="Wins ÷ trades"
            />
            <MetricCard
              label="Profit Factor"
              value={formatNumber(data.summary.profitFactor)}
              detail="Gross profit ÷ gross loss"
            />
            <MetricCard
              label="Total P&L"
              value={formatMoney(data.summary.totalPnl)}
              detail="Authoritative realized P&L"
              valueClassName={monetaryTone(data.summary.totalPnl) ?? undefined}
            />
            <MetricCard
              label="Total R"
              value={formatNumber(data.summary.totalR)}
              detail="Aggregate R multiple"
            />
            <MetricCard
              label="Expectancy"
              value={formatNumber(data.summary.expectancyR)}
              detail="Average R expectancy"
            />
          </section>

          <DataPanel aria-label="Performance details">
            <TableSummary>
              <span>Scoped Performance</span>
              <ScopeBadge>{scopeLabel}</ScopeBadge>
            </TableSummary>
            <ScopeContextBar>
              <span>Calculated from backend-confirmed Journal records</span>
              <span className="mx-2 text-[#36506a]">•</span>
              <span>
                Outcome <b>{data.summary.wins}W</b> / <b>{data.summary.losses}L</b> /{' '}
                <b>{data.summary.breakeven}B</b>
              </span>
              <span className="mx-2 text-[#36506a]">•</span>
              <span>
                Strategy <b>{selectedStrategyId ? selectedStrategyName : 'All Strategies'}</b>
              </span>
              {selectedAccount && (
                <>
                  <span className="mx-2 text-[#36506a]">•</span>
                  <span>
                    Account ID <b>{selectedAccount.id}</b>
                  </span>
                </>
              )}
            </ScopeContextBar>
            <MetricDetailGrid className="grid-cols-9 max-[1180px]:grid-cols-5 max-[760px]:grid-cols-2">
              {[
                ['Average P&L', formatMoney(data.summary.averagePnl)],
                ['Best Trade', formatMoney(data.summary.bestPnl)],
                ['Gross Profit', formatMoney(data.summary.grossProfit)],
                ['Gross Loss', formatMoney(data.summary.grossLoss)],
                ['Worst Trade', formatMoney(data.summary.worstPnl)],
                ['Average R', formatNumber(data.summary.averageR)],
                ['Average Winner', formatNumber(data.summary.averageWinnerR)],
                ['Average Loser', formatNumber(data.summary.averageLoserR)],
                ['Best R', formatNumber(data.summary.bestR)]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[#7f8fa6]">{label}</dt>
                  <dd className="m-0 text-lg font-bold">{value}</dd>
                </div>
              ))}
            </MetricDetailGrid>
          </DataPanel>

          <DataPanel aria-label="Performance by strategy">
            <TableSummary>
              <span>{data.byStrategy.length} strategy row(s)</span>
              <small>Grouped by Strategy ID</small>
            </TableSummary>
            {data.byStrategy.length === 0 ? (
              <div className="grid min-h-[160px] place-content-center text-center text-[#8294aa]">
                <strong className="text-[#d7e2ee]">No strategy analytics yet</strong>
              </div>
            ) : (
              <TableScroll>
                <Table className="min-w-[920px] border-collapse tabular-nums">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Wins</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Total P&amp;L</TableHead>
                      <TableHead>Average R</TableHead>
                      <TableHead>Total R</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byStrategy.map((row, index) => (
                      <TableRow
                        key={`${row.strategyId}-${index}`}
                        className={strategyRowClassName(index)}
                      >
                        <TableCell>
                          <strong>{row.strategy}</strong>
                          <span className={tableDetailClassName}>{row.strategyId}</span>
                        </TableCell>
                        <TableCell>{row.trades}</TableCell>
                        <TableCell>{row.wins}</TableCell>
                        <TableCell>{formatPercent(row.winRate)}</TableCell>
                        <TableCell className={monetaryTone(row.totalPnl)}>
                          {formatMoney(row.totalPnl)}
                        </TableCell>
                        <TableCell>{formatNumber(row.averageR)}</TableCell>
                        <TableCell>{formatNumber(row.totalR)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScroll>
            )}
          </DataPanel>

          <DataPanel aria-label="Performance by account">
            <TableSummary>
              <span>{data.byAccount?.length ?? 0} account row(s)</span>
              <small>Grouped by Trading Account</small>
            </TableSummary>
            {!data.byAccount || data.byAccount.length === 0 ? (
              <div className="grid min-h-[160px] place-content-center text-center text-[#8294aa]">
                <strong className="text-[#d7e2ee]">No account analytics yet</strong>
              </div>
            ) : (
              <TableScroll>
                <Table className="min-w-[1040px] border-collapse tabular-nums">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Wins</TableHead>
                      <TableHead>Losses</TableHead>
                      <TableHead>Breakeven</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Realized P&amp;L</TableHead>
                      <TableHead>Profit Factor</TableHead>
                      <TableHead>Total R</TableHead>
                      <TableHead>Average R</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byAccount.map((row, index) => (
                      <TableRow key={row.accountId} className={strategyRowClassName(index)}>
                        <TableCell>
                          <strong>{row.accountName ?? row.accountId}</strong>
                          <span className={tableDetailClassName}>{row.accountId}</span>
                        </TableCell>
                        <TableCell>{row.trades}</TableCell>
                        <TableCell>{row.wins}</TableCell>
                        <TableCell>{row.losses}</TableCell>
                        <TableCell>{row.breakeven}</TableCell>
                        <TableCell>{formatPercent(row.winRate)}</TableCell>
                        <TableCell className={monetaryTone(row.realizedPnl)}>
                          {formatMoney(row.realizedPnl)}
                        </TableCell>
                        <TableCell>{formatNumber(row.profitFactor)}</TableCell>
                        <TableCell>{formatNumber(row.totalR)}</TableCell>
                        <TableCell>{formatNumber(row.averageR)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScroll>
            )}
          </DataPanel>

          <DataPanel aria-label="Performance by strategy version">
            <TableSummary>
              <span>{data.byStrategyVersion.length} version row(s)</span>
              <small>Grouped by Strategy ID / Version</small>
            </TableSummary>
            {data.byStrategyVersion.length === 0 ? (
              <div className="grid min-h-[160px] place-content-center text-center text-[#8294aa]">
                <strong className="text-[#d7e2ee]">No strategy version analytics yet</strong>
              </div>
            ) : (
              <TableScroll>
                <Table className="min-w-[1040px] border-collapse tabular-nums">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Wins</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Total P&amp;L</TableHead>
                      <TableHead>Average R</TableHead>
                      <TableHead>Total R</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byStrategyVersion.map((row, index) => (
                      <TableRow
                        key={`${row.strategyId}-${row.version}-${index}`}
                        className={strategyRowClassName(index)}
                      >
                        <TableCell>
                          <strong>{row.strategy}</strong>
                          <span className={tableDetailClassName}>{row.strategyId}</span>
                        </TableCell>
                        <TableCell>{row.version}</TableCell>
                        <TableCell>{row.trades}</TableCell>
                        <TableCell>{row.wins}</TableCell>
                        <TableCell>{formatPercent(row.winRate)}</TableCell>
                        <TableCell className={monetaryTone(row.totalPnl)}>
                          {formatMoney(row.totalPnl)}
                        </TableCell>
                        <TableCell>{formatNumber(row.averageR)}</TableCell>
                        <TableCell>{formatNumber(row.totalR)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScroll>
            )}
          </DataPanel>
        </div>
      )}
    </PageShell>
  );
}
