import { useCallback, useEffect, useState } from 'react';
import type { AnalyticsDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { Button } from '@/components/ui/button';
import {
  DataPanel,
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingState,
  PageActions,
  PageHeader,
  PageShell,
  PageSubtitle,
  PageTitle,
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

function AnalyticsCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="relative min-h-[150px] overflow-hidden rounded-[14px] border border-[#1d3045] bg-[linear-gradient(145deg,rgba(18,32,50,0.92),rgba(11,23,38,0.9))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:-translate-y-px hover:border-[#2c4b56]">
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

function strategyRowClassName(row: number): string {
  return row % 2 === 0 ? 'bg-[rgba(255,255,255,0.01)]' : '';
}

function monetaryTone(value: number): string | undefined {
  if (value > 0) return 'text-[#79e9b4]';
  if (value < 0) return 'text-[#ff9da8]';
  return undefined;
}

export function Analytics({ gateway }: AnalyticsProps) {
  const [state, setState] = useState<AnalyticsState>({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await gateway.getAnalytics();
      setState({ data, loading: false, error: null });
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

  async function refresh() {
    if (state.loading) return;
    await load();
  }

  const data = state.data;

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
        <div className="grid gap-5">
          <section
            className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1"
            aria-label="Analytics summary"
          >
            <AnalyticsCard
              label="Trades"
              value={String(data.summary.trades)}
              detail="Closed trades"
            />
            <AnalyticsCard
              label="Win Rate"
              value={formatPercent(data.summary.winRate)}
              detail="Wins ÷ trades"
            />
            <AnalyticsCard
              label="Profit Factor"
              value={formatNumber(data.summary.profitFactor)}
              detail="Gross profit ÷ gross loss"
            />
            <AnalyticsCard
              label="Total P&L"
              value={formatMoney(data.summary.totalPnl)}
              detail="Authoritative realized P&L"
            />
            <AnalyticsCard
              label="Total R"
              value={formatNumber(data.summary.totalR)}
              detail="Aggregate R multiple"
            />
            <AnalyticsCard
              label="Expectancy"
              value={formatNumber(data.summary.expectancyR)}
              detail="Average R expectancy"
            />
          </section>

          <DataPanel aria-label="Performance details">
            <TableSummary>
              <span>
                {data.summary.wins} wins / {data.summary.losses} losses / {data.summary.breakeven}{' '}
                breakeven
              </span>
              <small>Read-only history</small>
            </TableSummary>
            <div className="grid gap-px bg-[#20364b] text-sm tabular-nums min-[760px]:grid-cols-3">
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
                <div key={label} className="bg-[#0c1929] p-4">
                  <dt className="mb-2 text-[10px] font-extrabold tracking-[0.11em] text-[#667a94] uppercase">
                    {label}
                  </dt>
                  <dd className="m-0 text-sm text-[#e5edf7]">{value}</dd>
                </div>
              ))}
            </div>
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
