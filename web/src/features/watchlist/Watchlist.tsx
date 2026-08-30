import { useCallback, useEffect, useState } from 'react';
import type { WatchlistDto, WatchlistItemDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CockpitStatusFilters } from '@/components/ui/cockpit-table-filters';
import {
  actionCellClassName,
  DataPanel,
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingState,
  numericCellClassName,
  PageActions,
  PageHeader,
  PageShell,
  PageSubtitle,
  PageTitle,
  screenReaderOnlyClassName,
  tableDetailClassName,
  tableTickerClassName,
  TableScroll,
  UpdatedAt
} from '@/components/ui/cockpit';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { WatchlistDetail } from './WatchlistDetail';
import { useCockpitTable } from '../shared/use-cockpit-table';

interface WatchlistProps {
  gateway: CockpitGateway;
}

interface WatchlistState {
  data: WatchlistDto | null;
  loading: boolean;
  error: string | null;
}

type WatchlistSortKey =
  'ticker' | 'strategy' | 'signalDate' | 'sector' | 'currentPrice' | 'momentumScore' | 'status';

const DEFAULT_WATCHLIST_STATUSES = ['WATCHING', 'PLANNED'] as const;

function formattedDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formattedTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formattedNumber(value: number | null, maximumFractionDigits = 2): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function toMillis(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function statusTone(status: string): 'positive' | 'muted' | 'planned' | 'watching' {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (normalized === 'READY' || normalized === 'ENTERED') return 'positive';
  if (normalized === 'CLOSED' || normalized === 'REJECTED') return 'muted';
  if (normalized === 'PLANNED') return 'planned';
  return 'watching';
}

function WatchlistRow({ item, onOpen }: { item: WatchlistItemDto; onOpen: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <strong className={tableTickerClassName}>{item.ticker}</strong>
        {item.company && <span className={tableDetailClassName}>{item.company}</span>}
      </TableCell>
      <TableCell>
        <span>{item.strategyName}</span>
        <span className={tableDetailClassName}>
          {item.strategyId} · v{item.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{formattedDate(item.signalDate)}</TableCell>
      <TableCell>{item.sector ?? '—'}</TableCell>
      <TableCell className={numericCellClassName}>{formattedNumber(item.currentPrice)}</TableCell>
      <TableCell className={`${numericCellClassName} font-extrabold text-[#79e9b4]`}>
        {formattedNumber(item.momentumScore, 0)}
      </TableCell>
      <TableCell>
        <Badge tone={statusTone(item.status)}>{item.status || '—'}</Badge>
        {item.setupStatus && (
          <span className={tableDetailClassName}>Setup: {item.setupStatus}</span>
        )}
      </TableCell>
      <TableCell className={actionCellClassName}>
        <Button onClick={onOpen} aria-label={`View ${item.ticker} details`}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function Watchlist({ gateway }: WatchlistProps) {
  const [state, setState] = useState<WatchlistState>({
    data: null,
    loading: true,
    error: null
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshingSignals, setRefreshingSignals] = useState(false);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await gateway.getWatchlist();
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

  async function refreshFinvizSignals() {
    if (refreshingSignals) return;
    setRefreshingSignals(true);
    try {
      await gateway.refreshFinviz();
      await load();
    } finally {
      setRefreshingSignals(false);
    }
  }

  const table = useCockpitTable<WatchlistItemDto, WatchlistSortKey>({
    items: state.data?.items ?? [],
    getStatus: (item: WatchlistItemDto) => item.status,
    defaultStatuses: DEFAULT_WATCHLIST_STATUSES,
    sortConfig: {
      defaultSortKey: 'ticker',
      defaultSortDirection: 'asc',
      descendingByDefaultKeys: ['signalDate', 'currentPrice', 'momentumScore']
    },
    sorters: {
      ticker: (left, right) =>
        left.ticker.localeCompare(right.ticker, undefined, { sensitivity: 'base', numeric: true }),
      strategy: (left, right) =>
        left.strategyName.localeCompare(right.strategyName, undefined, {
          sensitivity: 'base',
          numeric: true
        }),
      signalDate: (left, right) => toMillis(left.signalDate) - toMillis(right.signalDate),
      sector: (left, right) =>
        String(left.sector ?? '').localeCompare(String(right.sector ?? ''), undefined, {
          sensitivity: 'base',
          numeric: true
        }),
      currentPrice: (left, right) =>
        (left.currentPrice ?? Number.NEGATIVE_INFINITY) -
        (right.currentPrice ?? Number.NEGATIVE_INFINITY),
      momentumScore: (left, right) =>
        (left.momentumScore ?? Number.NEGATIVE_INFINITY) -
        (right.momentumScore ?? Number.NEGATIVE_INFINITY),
      status: (left, right) =>
        String(left.status || '').localeCompare(String(right.status || ''), undefined, {
          sensitivity: 'base',
          numeric: true
        })
    }
  });

  const selectedCandidate = state.data?.items.find((item) => item.id === selectedId) ?? null;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Trading workflow</Eyebrow>
          <PageTitle>Watchlist</PageTitle>
          <PageSubtitle>Candidates under active review across trading strategies</PageSubtitle>
        </div>
        <PageActions>
          {state.data && (
            <UpdatedAt>Updated {formattedTimestamp(state.data.generatedAt)}</UpdatedAt>
          )}
          <Button
            onClick={() => void refreshFinvizSignals()}
            disabled={state.loading || refreshingSignals}
          >
            <span aria-hidden="true">↻</span>
            {refreshingSignals
              ? 'Refreshing signals'
              : state.loading
                ? 'Refreshing'
                : 'Refresh Finviz'}
          </Button>
        </PageActions>
      </PageHeader>

      {state.loading && !state.data && <LoadingState>Loading watchlist…</LoadingState>}

      {state.error && (
        <ErrorState title="Watchlist unavailable" error={state.error} onRetry={() => void load()} />
      )}

      {state.data && state.data.items.length === 0 && !state.error && (
        <EmptyState icon="◎" title="No watchlist candidates">
          Candidates added from Google Sheets will appear here automatically.
        </EmptyState>
      )}

      {state.data && state.data.items.length > 0 && (
        <>
          {selectedCandidate && (
            <WatchlistDetail
              candidate={selectedCandidate}
              gateway={gateway}
              onClose={() => setSelectedId(null)}
              onTradePlanCreated={load}
            />
          )}
          <DataPanel aria-label="Watchlist candidates">
            <CockpitStatusFilters
              totalCount={state.data.items.length}
              visibleCount={table.filteredItems.length}
              availableStatuses={table.availableStatuses}
              activeStatuses={table.activeStatuses}
              onToggleStatus={table.toggleStatus}
              onReset={table.resetStatuses}
            />
            <TableScroll>
              <Table className="min-w-[960px] border-collapse tabular-nums">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      scope="col"
                      className="p-0"
                      aria-sort={
                        table.sortKey === 'ticker'
                          ? table.sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => table.setSort('ticker')}
                        aria-label={`Ticker${table.sortKey === 'ticker' ? `, sorted ${table.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ', sortable'}`}
                        className="flex h-full w-full items-center justify-start px-5 py-3 text-left"
                      >
                        Ticker{' '}
                        <span className="ml-2 text-[10px] text-[#62748d]">
                          {table.sortKey === 'ticker'
                            ? table.sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="p-0"
                      aria-sort={
                        table.sortKey === 'strategy'
                          ? table.sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => table.setSort('strategy')}
                        aria-label={`Strategy${table.sortKey === 'strategy' ? `, sorted ${table.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ', sortable'}`}
                        className="flex h-full w-full items-center justify-start px-5 py-3 text-left"
                      >
                        Strategy{' '}
                        <span className="ml-2 text-[10px] text-[#62748d]">
                          {table.sortKey === 'strategy'
                            ? table.sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="p-0"
                      aria-sort={
                        table.sortKey === 'signalDate'
                          ? table.sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => table.setSort('signalDate')}
                        aria-label={`Signal date${table.sortKey === 'signalDate' ? `, sorted ${table.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ', sortable'}`}
                        className="flex h-full w-full items-center justify-start px-5 py-3 text-left"
                      >
                        Signal date{' '}
                        <span className="ml-2 text-[10px] text-[#62748d]">
                          {table.sortKey === 'signalDate'
                            ? table.sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="p-0"
                      aria-sort={
                        table.sortKey === 'sector'
                          ? table.sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => table.setSort('sector')}
                        aria-label={`Sector${table.sortKey === 'sector' ? `, sorted ${table.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ', sortable'}`}
                        className="flex h-full w-full items-center justify-start px-5 py-3 text-left"
                      >
                        Sector{' '}
                        <span className="ml-2 text-[10px] text-[#62748d]">
                          {table.sortKey === 'sector'
                            ? table.sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead
                      scope="col"
                      className={`${numericCellClassName} p-0`}
                      aria-sort={
                        table.sortKey === 'currentPrice'
                          ? table.sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => table.setSort('currentPrice')}
                        aria-label={`Current price${table.sortKey === 'currentPrice' ? `, sorted ${table.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ', sortable'}`}
                        className="flex h-full w-full items-center justify-end px-5 py-3 text-right"
                      >
                        Current price{' '}
                        <span className="ml-2 text-[10px] text-[#62748d]">
                          {table.sortKey === 'currentPrice'
                            ? table.sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead
                      scope="col"
                      className={`${numericCellClassName} p-0`}
                      aria-sort={
                        table.sortKey === 'momentumScore'
                          ? table.sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => table.setSort('momentumScore')}
                        aria-label={`Momentum${table.sortKey === 'momentumScore' ? `, sorted ${table.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ', sortable'}`}
                        className="flex h-full w-full items-center justify-end px-5 py-3 text-right"
                      >
                        Momentum{' '}
                        <span className="ml-2 text-[10px] text-[#62748d]">
                          {table.sortKey === 'momentumScore'
                            ? table.sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="p-0"
                      aria-sort={
                        table.sortKey === 'status'
                          ? table.sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => table.setSort('status')}
                        aria-label={`Status${table.sortKey === 'status' ? `, sorted ${table.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ', sortable'}`}
                        className="flex h-full w-full items-center justify-start px-5 py-3 text-left"
                      >
                        Status{' '}
                        <span className="ml-2 text-[10px] text-[#62748d]">
                          {table.sortKey === 'status'
                            ? table.sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead scope="col">
                      <span className={screenReaderOnlyClassName}>Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.filteredItems.map((item) => (
                    <WatchlistRow item={item} key={item.id} onOpen={() => setSelectedId(item.id)} />
                  ))}
                </TableBody>
              </Table>
            </TableScroll>
          </DataPanel>
        </>
      )}

      {state.data &&
        state.data.items.length > 0 &&
        table.filteredItems.length === 0 &&
        !state.error && (
          <EmptyState icon="◎" title="No candidates match the selected filters">
            Adjust the status chips above or reset them to bring back Watching and Planned ideas.
          </EmptyState>
        )}
    </PageShell>
  );
}
