import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AddDiscoveryCandidateToWatchlistResponse,
  DiscoveryCandidateDto,
  DiscoveryDto
} from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CockpitSortHeader } from '@/components/ui/cockpit-sort-header';
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
  ActionColumn,
  actionCardClassName,
  DetailBackdrop,
  DetailGrid,
  DetailHeader,
  DetailPanel,
  errorNoticeClassName,
  FactGrid,
  FactSection,
  FactSections,
  successNoticeClassName
} from '@/components/ui/detail';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { useCockpitTable } from '../shared/use-cockpit-table';

interface DiscoveryProps {
  gateway: CockpitGateway;
}

interface DiscoveryState {
  data: DiscoveryDto | null;
  loading: boolean;
  error: string | null;
}

type DiscoverySortKey =
  'ticker' | 'strategy' | 'signalDate' | 'sector' | 'price' | 'relativeVolume' | 'watchlistStatus';

const DEFAULT_DISCOVERY_STATUSES = ['NOT WATCHED', 'WATCHING', 'PLANNED'] as const;

const DISCOVERY_SORTERS: Record<
  DiscoverySortKey,
  (left: DiscoveryCandidateDto, right: DiscoveryCandidateDto) => number
> = {
  ticker: (left, right) =>
    left.ticker.localeCompare(right.ticker, undefined, { sensitivity: 'base', numeric: true }),
  strategy: (left, right) =>
    strategyLabel(left).localeCompare(strategyLabel(right), undefined, {
      sensitivity: 'base',
      numeric: true
    }),
  signalDate: (left, right) => toMillis(left.signalDate) - toMillis(right.signalDate),
  sector: (left, right) =>
    String(left.sector ?? '').localeCompare(String(right.sector ?? ''), undefined, {
      sensitivity: 'base',
      numeric: true
    }),
  price: (left, right) =>
    (left.price ?? Number.NEGATIVE_INFINITY) - (right.price ?? Number.NEGATIVE_INFINITY),
  relativeVolume: (left, right) =>
    (left.relativeVolume ?? Number.NEGATIVE_INFINITY) -
    (right.relativeVolume ?? Number.NEGATIVE_INFINITY),
  watchlistStatus: (left, right) =>
    getDiscoveryStatus(left).localeCompare(getDiscoveryStatus(right), undefined, {
      sensitivity: 'base',
      numeric: true
    })
};

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function displayTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function displayNumber(value: number | null, maximumFractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function displayPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    style: 'percent'
  }).format(value);
}

function toMillis(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function statusTone(status: string | null): 'positive' | 'muted' | 'planned' | 'watching' {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (normalized === 'NOT WATCHED') return 'muted';
  if (normalized === 'PLANNED') return 'planned';
  if (normalized === 'READY' || normalized === 'WATCHING') return 'positive';
  return 'watching';
}

function candidateKey(candidate: DiscoveryCandidateDto): string {
  return [
    candidate.strategyId,
    candidate.strategyVersion,
    candidate.signalDate ?? '',
    candidate.ticker
  ].join('::');
}

function strategyKey(candidate: Pick<DiscoveryCandidateDto, 'strategyId' | 'strategyVersion'>) {
  return `${candidate.strategyId}::${candidate.strategyVersion}`;
}

function strategyLabel(
  candidate: Pick<DiscoveryCandidateDto, 'strategyName' | 'strategyVersion'>
): string {
  return `${candidate.strategyName} ${candidate.strategyVersion}`.trim();
}

function resultMessage(result: AddDiscoveryCandidateToWatchlistResponse): string {
  return result.kind === 'added'
    ? `${result.ticker} added to Watchlist as ${result.status}.`
    : `${result.ticker} is already in Watchlist as ${result.status}.`;
}

function DiscoveryRow({
  candidate,
  adding,
  onOpen,
  onAdd
}: {
  candidate: DiscoveryCandidateDto;
  adding: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const alreadyWatched = Boolean(candidate.watchlistStatus);
  const missingIdentity = !candidate.signalDate;
  const status = getDiscoveryStatus(candidate);

  return (
    <TableRow>
      <TableCell>
        <strong className={tableTickerClassName}>{candidate.ticker}</strong>
        {candidate.company && <span className={tableDetailClassName}>{candidate.company}</span>}
      </TableCell>
      <TableCell>
        <span>{candidate.strategyName}</span>
        <span className={tableDetailClassName}>
          {candidate.strategyId} · {candidate.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{displayDate(candidate.signalDate)}</TableCell>
      <TableCell>{candidate.sector ?? '—'}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(candidate.price)}</TableCell>
      <TableCell className={numericCellClassName}>
        {displayNumber(candidate.relativeVolume)}
      </TableCell>
      <TableCell>
        <Badge tone={statusTone(status)}>{status}</Badge>
      </TableCell>
      <TableCell className={actionCellClassName}>
        <div className="flex justify-end gap-2">
          <Button onClick={onOpen} aria-label={`View ${candidate.ticker} Discovery details`}>
            View
          </Button>
          <Button
            onClick={onAdd}
            disabled={alreadyWatched || missingIdentity || adding}
            aria-label={`Add ${candidate.ticker} to Watchlist`}
          >
            {alreadyWatched ? 'Watched' : adding ? 'Adding' : 'Add'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function DiscoveryCandidateDetail({
  candidate,
  adding,
  feedback,
  error,
  onAdd,
  onClose
}: {
  candidate: DiscoveryCandidateDto;
  adding: boolean;
  feedback: string | null;
  error: string | null;
  onAdd: () => void;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLElement>(null);
  const alreadyWatched = Boolean(candidate.watchlistStatus);
  const missingIdentity = !candidate.signalDate;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <DetailBackdrop
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <DetailPanel
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discovery-candidate-detail-title"
        tabIndex={-1}
      >
        <DetailHeader>
          <div>
            <Eyebrow>Discovery · Latest screener result</Eyebrow>
            <h2 id="discovery-candidate-detail-title">{candidate.ticker}</h2>
            <p>{candidate.company ?? strategyLabel(candidate)}</p>
          </div>
          <Button onClick={onClose} aria-label="Close Discovery candidate details">
            Close
          </Button>
        </DetailHeader>

        <DetailGrid>
          <FactSections>
            <FactSection>
              <header>
                <span aria-hidden="true">01</span>
                <div>
                  <h3>Candidate</h3>
                  <p>Latest archived screener snapshot for the selected Strategy Version</p>
                </div>
              </header>
              <FactGrid columns={2}>
                <div>
                  <dt>Strategy</dt>
                  <dd>{candidate.strategyName}</dd>
                  <small>
                    {candidate.strategyId} · {candidate.strategyVersion}
                  </small>
                </div>
                <div>
                  <dt>Watchlist state</dt>
                  <dd>
                    <Badge tone={statusTone(getDiscoveryStatus(candidate))}>
                      {getDiscoveryStatus(candidate)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt>Signal date</dt>
                  <dd>{displayDate(candidate.signalDate)}</dd>
                </div>
                <div>
                  <dt>Detected at</dt>
                  <dd>{candidate.detectedAt ? displayTimestamp(candidate.detectedAt) : '—'}</dd>
                </div>
                <div>
                  <dt>Sector</dt>
                  <dd>{candidate.sector ?? '—'}</dd>
                </div>
                <div>
                  <dt>Industry</dt>
                  <dd>{candidate.industry ?? '—'}</dd>
                </div>
              </FactGrid>
            </FactSection>

            <FactSection tone="price">
              <header>
                <span aria-hidden="true">02</span>
                <div>
                  <h3>Screener snapshot</h3>
                  <p>Provider values archived in Signals History</p>
                </div>
              </header>
              <FactGrid columns={3}>
                <div>
                  <dt>Price</dt>
                  <dd>{displayNumber(candidate.price)}</dd>
                </div>
                <div>
                  <dt>52W High</dt>
                  <dd>{displayNumber(candidate.high52)}</dd>
                </div>
                <div>
                  <dt>Relative Volume</dt>
                  <dd>{displayNumber(candidate.relativeVolume)}</dd>
                </div>
                <div>
                  <dt>Average Volume</dt>
                  <dd>{displayNumber(candidate.averageVolume, 0)}</dd>
                </div>
                <div>
                  <dt>RSI</dt>
                  <dd>{displayNumber(candidate.rsi)}</dd>
                </div>
                <div>
                  <dt>Change</dt>
                  <dd>{displayPercent(candidate.change)}</dd>
                </div>
                <div>
                  <dt>Performance Week</dt>
                  <dd>{displayPercent(candidate.performanceWeek)}</dd>
                </div>
                <div>
                  <dt>Performance Month</dt>
                  <dd>{displayPercent(candidate.performanceMonth)}</dd>
                </div>
                <div>
                  <dt>Earnings Date</dt>
                  <dd>{candidate.earningsDate ?? '—'}</dd>
                </div>
              </FactGrid>
            </FactSection>
          </FactSections>

          <ActionColumn>
            <div className={actionCardClassName}>
              <div>
                <strong>Add to Watchlist</strong>
                <p>
                  Human selection remains required. The backend resolves this candidate from Signals
                  History and applies the existing duplicate rule.
                </p>
              </div>
              <Button onClick={onAdd} disabled={alreadyWatched || missingIdentity || adding}>
                {alreadyWatched ? 'Already watched' : adding ? 'Adding' : 'Add'}
              </Button>
            </div>

            {missingIdentity && (
              <div className={errorNoticeClassName}>
                This candidate cannot be added because its Signal Date is missing.
              </div>
            )}
            {feedback && <div className={successNoticeClassName}>{feedback}</div>}
            {error && <div className={errorNoticeClassName}>{error}</div>}
          </ActionColumn>
        </DetailGrid>
      </DetailPanel>
    </DetailBackdrop>
  );
}

export function Discovery({ gateway }: DiscoveryProps) {
  const [state, setState] = useState<DiscoveryState>({
    data: null,
    loading: true,
    error: null
  });
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await gateway.getDiscovery();
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

  const strategyFilteredItems = useMemo(() => {
    const items = state.data?.items ?? [];
    if (selectedStrategy === 'ALL') return items;
    return items.filter((candidate) => strategyKey(candidate) === selectedStrategy);
  }, [selectedStrategy, state.data?.items]);

  const selectedStrategyId = selectedStrategy === 'ALL' ? null : selectedStrategy.split('::')[0];

  const sorters = useMemo<Record<DiscoverySortKey, typeof DISCOVERY_SORTERS.ticker>>(
    () => DISCOVERY_SORTERS,
    []
  );

  const table = useCockpitTable<DiscoveryCandidateDto, DiscoverySortKey>({
    items: strategyFilteredItems,
    getStatus: getDiscoveryStatus,
    defaultStatuses: DEFAULT_DISCOVERY_STATUSES,
    sortConfig: {
      defaultSortKey: 'signalDate',
      defaultSortDirection: 'desc',
      descendingByDefaultKeys: ['signalDate', 'price', 'relativeVolume']
    },
    sorters
  });

  const selectedCandidate =
    state.data?.items.find((candidate) => candidateKey(candidate) === selectedKey) ?? null;

  async function refreshSignals() {
    if (refreshingSignals || !selectedStrategyId) return;
    setRefreshingSignals(true);
    setFeedback(null);
    setActionError(null);
    try {
      const result = await gateway.refreshSignals({ strategyId: selectedStrategyId });
      setFeedback(
        `${result.archived} signal(s) refreshed for ${selectedStrategyId}. Discovery now reads the latest snapshot.`
      );
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshingSignals(false);
    }
  }

  async function refreshAllSignals() {
    if (refreshingSignals) return;
    setRefreshingSignals(true);
    setFeedback(null);
    setActionError(null);
    try {
      const result = await gateway.refreshAllSignals();
      setFeedback(
        `${result.archived} signal(s) refreshed across all active strategies. Discovery now reads the latest snapshots.`
      );
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshingSignals(false);
    }
  }

  async function addCandidate(candidate: DiscoveryCandidateDto) {
    const key = candidateKey(candidate);
    if (addingKey || candidate.watchlistStatus || !candidate.signalDate) return;

    setAddingKey(key);
    setFeedback(null);
    setActionError(null);
    try {
      const result = await gateway.addDiscoveryCandidateToWatchlist({
        strategyId: candidate.strategyId,
        strategyVersion: candidate.strategyVersion,
        signalDate: candidate.signalDate,
        ticker: candidate.ticker
      });
      setFeedback(resultMessage(result));
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Strategy Discovery</Eyebrow>
          <PageTitle>Discovery</PageTitle>
          <PageSubtitle>
            Refresh provider signals, review latest screener candidates, then manually add selected
            ideas to Watchlist.
          </PageSubtitle>
        </div>
        <PageActions>
          {state.data && <UpdatedAt>Updated {displayTimestamp(state.data.generatedAt)}</UpdatedAt>}
          <Button
            onClick={() => void refreshSignals()}
            disabled={state.loading || refreshingSignals || !selectedStrategyId}
            title={
              selectedStrategyId
                ? 'Refresh the selected strategy signals'
                : 'Select one strategy to refresh its signals'
            }
          >
            <span aria-hidden="true">↻</span>
            {refreshingSignals ? 'Refreshing signals' : 'Refresh Signals'}
          </Button>
          <Button
            variant="retry"
            onClick={() => void refreshAllSignals()}
            disabled={state.loading || refreshingSignals}
          >
            <span aria-hidden="true">↻</span>
            {refreshingSignals ? 'Refreshing all' : 'Refresh All'}
          </Button>
        </PageActions>
      </PageHeader>

      <DataPanel aria-label="Discovery strategies" className="mb-5">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <label
            htmlFor="discovery-strategy"
            className="text-[10px] font-extrabold tracking-[0.14em] text-[#64758d] uppercase"
          >
            Strategy
          </label>
          <select
            id="discovery-strategy"
            value={selectedStrategy}
            onChange={(event) => setSelectedStrategy(event.target.value)}
            className="min-w-[260px] rounded-[10px] border border-[#244059] bg-[#071421] px-3 py-2 text-sm text-[#d6e5f4] outline-none focus:border-[#4ee1a0] focus:ring-2 focus:ring-[rgba(78,225,160,0.15)]"
          >
            <option value="ALL">All active strategies</option>
            {(state.data?.strategies ?? []).map((strategy) => (
              <option
                key={`${strategy.strategyId}::${strategy.strategyVersion}`}
                value={`${strategy.strategyId}::${strategy.strategyVersion}`}
              >
                {strategy.strategyName} · {strategy.strategyVersion}
              </option>
            ))}
          </select>
        </div>
      </DataPanel>

      {state.loading && !state.data && <LoadingState>Loading Discovery candidates…</LoadingState>}

      {state.error && (
        <ErrorState title="Discovery unavailable" error={state.error} onRetry={() => void load()} />
      )}

      {actionError && !selectedCandidate && (
        <div className={`${errorNoticeClassName} mb-5`}>{actionError}</div>
      )}
      {feedback && !selectedCandidate && (
        <div className={`${successNoticeClassName} mb-5`}>{feedback}</div>
      )}

      {state.data && state.data.items.length === 0 && !state.error && (
        <EmptyState icon="⌕" title="No Discovery candidates">
          Refresh Signals to populate Discovery from the latest configured screeners.
        </EmptyState>
      )}

      {selectedCandidate && (
        <DiscoveryCandidateDetail
          candidate={selectedCandidate}
          adding={addingKey === candidateKey(selectedCandidate)}
          feedback={feedback}
          error={actionError}
          onAdd={() => void addCandidate(selectedCandidate)}
          onClose={() => setSelectedKey(null)}
        />
      )}

      {state.data && state.data.items.length > 0 && (
        <DataPanel aria-label="Discovery candidates">
          <CockpitStatusFilters
            totalCount={strategyFilteredItems.length}
            visibleCount={table.filteredItems.length}
            availableStatuses={table.availableStatuses}
            activeStatuses={table.activeStatuses}
            onToggleStatus={table.toggleStatus}
            onReset={table.resetStatuses}
            defaultLabel="Human selection"
          />
          <TableScroll>
            <Table className="min-w-[1100px] border-collapse tabular-nums">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Ticker"
                      active={table.sortKey === 'ticker'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('ticker')}
                    />
                  </TableHead>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Strategy"
                      active={table.sortKey === 'strategy'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('strategy')}
                    />
                  </TableHead>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Signal date"
                      active={table.sortKey === 'signalDate'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('signalDate')}
                    />
                  </TableHead>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Sector"
                      active={table.sortKey === 'sector'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('sector')}
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Price"
                      active={table.sortKey === 'price'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('price')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="RelVol"
                      active={table.sortKey === 'relativeVolume'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('relativeVolume')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Status"
                      active={table.sortKey === 'watchlistStatus'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('watchlistStatus')}
                    />
                  </TableHead>
                  <TableHead scope="col">
                    <span className={screenReaderOnlyClassName}>Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.filteredItems.map((candidate) => (
                  <DiscoveryRow
                    key={candidateKey(candidate)}
                    candidate={candidate}
                    adding={addingKey === candidateKey(candidate)}
                    onOpen={() => setSelectedKey(candidateKey(candidate))}
                    onAdd={() => void addCandidate(candidate)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </DataPanel>
      )}

      {state.data &&
        state.data.items.length > 0 &&
        table.filteredItems.length === 0 &&
        !state.error && (
          <EmptyState icon="⌕" title="No candidates match the selected filters">
            Adjust the status chips above or reset them to bring back Discovery candidates.
          </EmptyState>
        )}
    </PageShell>
  );
}

function getDiscoveryStatus(candidate: DiscoveryCandidateDto): string {
  return candidate.watchlistStatus ?? 'NOT WATCHED';
}
