import { useCallback, useEffect, useMemo, useState } from 'react';
import type { JournalDto, JournalItemDto, JournalOutcomeDto } from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CockpitSortHeader, type SortDirection } from '@/components/ui/cockpit-sort-header';
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
  TableSummary,
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
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { JournalDetail } from './JournalDetail';

interface JournalProps {
  gateway: CockpitGateway;
}
interface JournalState {
  data: JournalDto | null;
  loading: boolean;
  error: string | null;
}
type OutcomeFilter = 'ALL' | Exclude<JournalOutcomeDto, null>;
type JournalSortKey =
  | 'ticker'
  | 'accountId'
  | 'strategy'
  | 'openedAt'
  | 'closedAt'
  | 'actualEntry'
  | 'exitPrice'
  | 'quantity'
  | 'realizedPnl'
  | 'rMultiple'
  | 'outcome';

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}
function displayTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date
  );
}
function displayNumber(value: number | null, digits = 2): string {
  return value === null
    ? '—'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}
function displaySigned(value: number | null): string {
  if (value === null) return '—';
  const amount = displayNumber(Math.abs(value));
  return value > 0 ? `+${amount}` : value < 0 ? `−${amount}` : amount;
}
function toMillis(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}
function outcomeTone(outcome: JournalOutcomeDto): 'positive' | 'muted' | 'planned' {
  if (outcome === 'WIN') return 'positive';
  if (outcome === 'LOSS') return 'planned';
  return 'muted';
}

function pnlClass(value: number | null): string {
  if (value !== null && value > 0) return 'text-[#79e9b4]';
  if (value !== null && value < 0) return 'text-[#ff9da8]';
  return 'text-[#b6c2d0]';
}

function JournalRow({ entry, onOpen }: { entry: JournalItemDto; onOpen: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <strong className={tableTickerClassName}>{entry.ticker}</strong>
        <span className={tableDetailClassName}>{entry.id}</span>
      </TableCell>
      <TableCell>{entry.accountId || '—'}</TableCell>
      <TableCell>
        <span>{entry.strategyName}</span>
        <span className={tableDetailClassName}>
          {entry.strategyId} · v{entry.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{displayDate(entry.openedAt)}</TableCell>
      <TableCell>{displayDate(entry.closedAt)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(entry.actualEntry)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(entry.exitPrice)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(entry.quantity, 0)}</TableCell>
      <TableCell className={numericCellClassName}>
        <span className={pnlClass(entry.realizedPnl)}>{displaySigned(entry.realizedPnl)}</span>
      </TableCell>
      <TableCell className={numericCellClassName}>
        {displayNumber(entry.rMultiple)}
        {entry.rMultiple !== null ? ' R' : ''}
      </TableCell>
      <TableCell>
        <Badge tone={outcomeTone(entry.outcome)}>{entry.outcome ?? '—'}</Badge>
      </TableCell>
      <TableCell className={actionCellClassName}>
        <Button onClick={onOpen} aria-label={`Review ${entry.ticker} Journal entry`}>
          Review
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function Journal({ gateway }: JournalProps) {
  const [state, setState] = useState<JournalState>({ data: null, loading: true, error: null });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticker, setTicker] = useState('');
  const [account, setAccount] = useState('ALL');
  const [strategy, setStrategy] = useState('ALL');
  const [outcome, setOutcome] = useState<OutcomeFilter>('ALL');
  const [sortKey, setSortKey] = useState<JournalSortKey>('closedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ data: await gateway.getJournal(), loading: false, error: null });
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

  const accounts = useMemo(
    () =>
      [...new Set(state.data?.items.map((item) => item.accountId).filter(Boolean) ?? [])].sort(),
    [state.data]
  );
  const strategies = useMemo(
    () =>
      [...new Set(state.data?.items.map((item) => item.strategyName).filter(Boolean) ?? [])].sort(),
    [state.data]
  );
  const filteredItems = useMemo(() => {
    const normalizedTicker = ticker.trim().toUpperCase();
    const filtered =
      state.data?.items.filter(
        (entry) =>
          (!normalizedTicker || entry.ticker.toUpperCase().includes(normalizedTicker)) &&
          (account === 'ALL' || entry.accountId === account) &&
          (strategy === 'ALL' || entry.strategyName === strategy) &&
          (outcome === 'ALL' || entry.outcome === outcome)
      ) ?? [];

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((left, right) => {
      let comparison = 0;
      switch (sortKey) {
        case 'ticker':
          comparison = left.ticker.localeCompare(right.ticker, undefined, {
            sensitivity: 'base',
            numeric: true
          });
          break;
        case 'accountId':
          comparison = String(left.accountId || '').localeCompare(
            String(right.accountId || ''),
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          );
          break;
        case 'strategy':
          comparison = left.strategyName.localeCompare(right.strategyName, undefined, {
            sensitivity: 'base',
            numeric: true
          });
          break;
        case 'openedAt':
          comparison = toMillis(left.openedAt) - toMillis(right.openedAt);
          break;
        case 'closedAt':
          comparison = toMillis(left.closedAt) - toMillis(right.closedAt);
          break;
        case 'actualEntry':
          comparison =
            (left.actualEntry ?? Number.NEGATIVE_INFINITY) -
            (right.actualEntry ?? Number.NEGATIVE_INFINITY);
          break;
        case 'exitPrice':
          comparison =
            (left.exitPrice ?? Number.NEGATIVE_INFINITY) -
            (right.exitPrice ?? Number.NEGATIVE_INFINITY);
          break;
        case 'quantity':
          comparison =
            (left.quantity ?? Number.NEGATIVE_INFINITY) -
            (right.quantity ?? Number.NEGATIVE_INFINITY);
          break;
        case 'realizedPnl':
          comparison =
            (left.realizedPnl ?? Number.NEGATIVE_INFINITY) -
            (right.realizedPnl ?? Number.NEGATIVE_INFINITY);
          break;
        case 'rMultiple':
          comparison =
            (left.rMultiple ?? Number.NEGATIVE_INFINITY) -
            (right.rMultiple ?? Number.NEGATIVE_INFINITY);
          break;
        case 'outcome':
          comparison = String(left.outcome || '').localeCompare(
            String(right.outcome || ''),
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          );
          break;
      }

      if (comparison === 0) {
        comparison = left.ticker.localeCompare(right.ticker, undefined, {
          sensitivity: 'base',
          numeric: true
        });
      }

      return comparison * direction;
    });
  }, [account, outcome, sortDirection, sortKey, state.data, strategy, ticker]);
  const selectedEntry = state.data?.items.find((entry) => entry.id === selectedId) ?? null;
  const hasFilters =
    Boolean(ticker) || account !== 'ALL' || strategy !== 'ALL' || outcome !== 'ALL';

  function setSort(key: JournalSortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(
      key === 'openedAt' || key === 'closedAt' || key === 'realizedPnl' ? 'desc' : 'asc'
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Trading review</Eyebrow>
          <PageTitle>Journal</PageTitle>
          <PageSubtitle>Review backend-confirmed completed trades</PageSubtitle>
        </div>
        <PageActions>
          {state.data && <UpdatedAt>Updated {displayTimestamp(state.data.generatedAt)}</UpdatedAt>}
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </PageActions>
      </PageHeader>
      {state.loading && !state.data && <LoadingState>Loading Journal…</LoadingState>}
      {state.error && (
        <ErrorState title="Journal unavailable" error={state.error} onRetry={() => void load()} />
      )}
      {state.data && state.data.items.length === 0 && !state.error && (
        <EmptyState icon="▤" title="No completed trades">
          Backend-confirmed Journal entries will appear here after Positions close.
        </EmptyState>
      )}
      {selectedEntry && <JournalDetail entry={selectedEntry} onClose={() => setSelectedId(null)} />}
      {state.data && state.data.items.length > 0 && (
        <>
          <section
            className="mb-[18px] grid grid-cols-[minmax(140px,0.8fr)_repeat(3,minmax(150px,1fr))_auto] items-end gap-3 rounded-xl border border-[#1c3447] bg-[rgba(10,24,39,0.82)] p-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1 [&_label]:grid [&_label]:gap-[7px] [&_label>span]:text-[9px] [&_label>span]:font-extrabold [&_label>span]:tracking-[0.11em] [&_label>span]:text-[#71869d] [&_label>span]:uppercase [&_input]:min-h-10 [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-[#294256] [&_input]:bg-[#0a1826] [&_input]:px-[11px] [&_input]:text-xs [&_input]:text-[#e5edf7] [&_input]:outline-none focus-within:[&_input]:border-[#4ee1a0] focus-within:[&_input]:ring-2 focus-within:[&_input]:ring-[rgba(78,225,160,0.14)] [&_select]:min-h-10 [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:border-[#294256] [&_select]:bg-[#0a1826] [&_select]:px-[11px] [&_select]:text-xs [&_select]:text-[#e5edf7] [&_select]:outline-none focus-within:[&_select]:border-[#4ee1a0] focus-within:[&_select]:ring-2 focus-within:[&_select]:ring-[rgba(78,225,160,0.14)]"
            aria-label="Journal filters"
          >
            <label>
              <span>Ticker</span>
              <input
                type="search"
                value={ticker}
                onChange={(event) => setTicker(event.target.value)}
                placeholder="Search ticker"
              />
            </label>
            <label>
              <span>Account</span>
              <select value={account} onChange={(event) => setAccount(event.target.value)}>
                <option value="ALL">All accounts</option>
                {accounts.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Strategy</span>
              <select value={strategy} onChange={(event) => setStrategy(event.target.value)}>
                <option value="ALL">All strategies</option>
                {strategies.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Outcome</span>
              <select
                value={outcome}
                onChange={(event) => setOutcome(event.target.value as OutcomeFilter)}
              >
                <option value="ALL">All outcomes</option>
                <option value="WIN">Wins</option>
                <option value="LOSS">Losses</option>
                <option value="BREAKEVEN">Breakeven</option>
              </select>
            </label>
            {hasFilters && (
              <Button
                onClick={() => {
                  setTicker('');
                  setAccount('ALL');
                  setStrategy('ALL');
                  setOutcome('ALL');
                }}
              >
                Clear filters
              </Button>
            )}
          </section>
          <DataPanel aria-label="Trading Journal">
            <TableSummary>
              <span>
                {filteredItems.length} of {state.data.items.length} trades
              </span>
              <small>Read-only history</small>
            </TableSummary>
            {filteredItems.length === 0 ? (
              <div className="grid min-h-[220px] place-content-center text-center text-[#8294aa]">
                <strong className="text-[#d7e2ee]">No matching trades</strong>
                <p className="mt-[7px] mb-0 text-xs">Adjust or clear the current filters.</p>
              </div>
            ) : (
              <TableScroll>
                <Table className="min-w-[1460px] border-collapse tabular-nums">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="p-0">
                        <CockpitSortHeader
                          label="Ticker"
                          active={sortKey === 'ticker'}
                          direction={sortDirection}
                          onClick={() => setSort('ticker')}
                        />
                      </TableHead>
                      <TableHead scope="col" className="p-0">
                        <CockpitSortHeader
                          label="Account"
                          active={sortKey === 'accountId'}
                          direction={sortDirection}
                          onClick={() => setSort('accountId')}
                        />
                      </TableHead>
                      <TableHead scope="col" className="p-0">
                        <CockpitSortHeader
                          label="Strategy"
                          active={sortKey === 'strategy'}
                          direction={sortDirection}
                          onClick={() => setSort('strategy')}
                        />
                      </TableHead>
                      <TableHead scope="col" className="p-0">
                        <CockpitSortHeader
                          label="Opened"
                          active={sortKey === 'openedAt'}
                          direction={sortDirection}
                          onClick={() => setSort('openedAt')}
                        />
                      </TableHead>
                      <TableHead scope="col" className="p-0">
                        <CockpitSortHeader
                          label="Closed"
                          active={sortKey === 'closedAt'}
                          direction={sortDirection}
                          onClick={() => setSort('closedAt')}
                        />
                      </TableHead>
                      <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                        <CockpitSortHeader
                          label="Entry"
                          active={sortKey === 'actualEntry'}
                          direction={sortDirection}
                          onClick={() => setSort('actualEntry')}
                          align="right"
                        />
                      </TableHead>
                      <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                        <CockpitSortHeader
                          label="Exit"
                          active={sortKey === 'exitPrice'}
                          direction={sortDirection}
                          onClick={() => setSort('exitPrice')}
                          align="right"
                        />
                      </TableHead>
                      <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                        <CockpitSortHeader
                          label="Quantity"
                          active={sortKey === 'quantity'}
                          direction={sortDirection}
                          onClick={() => setSort('quantity')}
                          align="right"
                        />
                      </TableHead>
                      <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                        <CockpitSortHeader
                          label="Realized P&L"
                          active={sortKey === 'realizedPnl'}
                          direction={sortDirection}
                          onClick={() => setSort('realizedPnl')}
                          align="right"
                        />
                      </TableHead>
                      <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                        <CockpitSortHeader
                          label="R-Multiple"
                          active={sortKey === 'rMultiple'}
                          direction={sortDirection}
                          onClick={() => setSort('rMultiple')}
                          align="right"
                        />
                      </TableHead>
                      <TableHead scope="col" className="p-0">
                        <CockpitSortHeader
                          label="Outcome"
                          active={sortKey === 'outcome'}
                          direction={sortDirection}
                          onClick={() => setSort('outcome')}
                        />
                      </TableHead>
                      <TableHead scope="col">
                        <span className={screenReaderOnlyClassName}>Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((entry) => (
                      <JournalRow
                        key={entry.id}
                        entry={entry}
                        onOpen={() => setSelectedId(entry.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableScroll>
            )}
          </DataPanel>
        </>
      )}
    </PageShell>
  );
}
