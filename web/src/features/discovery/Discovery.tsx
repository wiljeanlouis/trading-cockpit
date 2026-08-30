import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AddMomentumCandidateToWatchlistResponse,
  MomentumRankingDto,
  MomentumRankingItemDto
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
  data: MomentumRankingDto | null;
  loading: boolean;
  error: string | null;
}

type DiscoverySortKey =
  | 'rank'
  | 'ticker'
  | 'signalDate'
  | 'sector'
  | 'price'
  | 'relativeVolume'
  | 'momentumScore'
  | 'reviewStatus'
  | 'watchlistStatus';

const DEFAULT_DISCOVERY_STATUSES = ['READY', 'WATCH', 'REVIEW'] as const;

const DISCOVERY_SORTERS: Record<
  DiscoverySortKey,
  (left: MomentumRankingItemDto, right: MomentumRankingItemDto) => number
> = {
  rank: () => 0,
  ticker: (left, right) =>
    left.ticker.localeCompare(right.ticker, undefined, { sensitivity: 'base', numeric: true }),
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
  momentumScore: (left, right) =>
    (left.momentumScore ?? Number.NEGATIVE_INFINITY) -
    (right.momentumScore ?? Number.NEGATIVE_INFINITY),
  reviewStatus: (left, right) =>
    String(left.reviewStatus || '').localeCompare(String(right.reviewStatus || ''), undefined, {
      sensitivity: 'base',
      numeric: true
    }),
  watchlistStatus: (left, right) =>
    String(left.watchlistStatus || '').localeCompare(
      String(right.watchlistStatus || ''),
      undefined,
      {
        sensitivity: 'base',
        numeric: true
      }
    )
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
  if (normalized === 'READY' || normalized === 'WATCH') return 'positive';
  if (normalized === 'REJECT' || normalized === 'REJECTED') return 'muted';
  if (normalized === 'PLANNED') return 'planned';
  return 'watching';
}

function candidateKey(candidate: MomentumRankingItemDto): string {
  return [
    candidate.strategyId,
    candidate.strategyVersion,
    candidate.signalDate ?? '',
    candidate.ticker
  ].join('::');
}

function resultMessage(result: AddMomentumCandidateToWatchlistResponse): string {
  return result.kind === 'added'
    ? `${result.ticker} added to Watchlist as ${result.status}.`
    : `${result.ticker} is already in Watchlist as ${result.status}.`;
}

function DiscoveryRow({
  candidate,
  rank,
  adding,
  onOpen,
  onAdd
}: {
  candidate: MomentumRankingItemDto;
  rank: number;
  adding: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const alreadyWatched = Boolean(candidate.watchlistStatus);
  const missingIdentity = !candidate.signalDate;

  return (
    <TableRow>
      <TableCell className="font-extrabold text-[#7f91a9]">#{rank}</TableCell>
      <TableCell>
        <strong className={tableTickerClassName}>{candidate.ticker}</strong>
        {candidate.company && <span className={tableDetailClassName}>{candidate.company}</span>}
      </TableCell>
      <TableCell>{displayDate(candidate.signalDate)}</TableCell>
      <TableCell>{candidate.sector ?? '—'}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(candidate.price)}</TableCell>
      <TableCell className={numericCellClassName}>
        {displayNumber(candidate.relativeVolume)}
      </TableCell>
      <TableCell className={`${numericCellClassName} font-extrabold text-[#79e9b4]`}>
        {displayNumber(candidate.momentumScore, 0)}
      </TableCell>
      <TableCell>
        <Badge tone={statusTone(candidate.reviewStatus)}>{candidate.reviewStatus || '—'}</Badge>
        {candidate.watchlistStatus && (
          <span className={tableDetailClassName}>Watchlist: {candidate.watchlistStatus}</span>
        )}
      </TableCell>
      <TableCell className={actionCellClassName}>
        <div className="flex justify-end gap-2">
          <Button onClick={onOpen} aria-label={`View ${candidate.ticker} Momentum details`}>
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

function MomentumCandidateDetail({
  candidate,
  adding,
  feedback,
  error,
  onAdd,
  onClose
}: {
  candidate: MomentumRankingItemDto;
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
        aria-labelledby="momentum-candidate-detail-title"
        tabIndex={-1}
      >
        <DetailHeader>
          <div>
            <Eyebrow>Discovery · Momentum Breakout</Eyebrow>
            <h2 id="momentum-candidate-detail-title">{candidate.ticker}</h2>
            <p>{candidate.company ?? candidate.strategyName}</p>
          </div>
          <Button onClick={onClose} aria-label="Close Momentum candidate details">
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
                  <p>Backend-ranked Momentum Breakout signal</p>
                </div>
              </header>
              <FactGrid columns={2}>
                <div>
                  <dt>Strategy</dt>
                  <dd>{candidate.strategyName}</dd>
                  <small>
                    {candidate.strategyId} · v{candidate.strategyVersion}
                  </small>
                </div>
                <div>
                  <dt>Review status</dt>
                  <dd>
                    <Badge tone={statusTone(candidate.reviewStatus)}>
                      {candidate.reviewStatus || '—'}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt>Signal date</dt>
                  <dd>{displayDate(candidate.signalDate)}</dd>
                </div>
                <div>
                  <dt>Sector</dt>
                  <dd>{candidate.sector ?? '—'}</dd>
                </div>
              </FactGrid>
            </FactSection>

            <FactSection tone="price">
              <header>
                <span aria-hidden="true">02</span>
                <div>
                  <h3>Ranking inputs</h3>
                  <p>Values returned by the backend ranked candidate workflow</p>
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
                  <small>Score: {displayNumber(candidate.high52Score, 0)}</small>
                </div>
                <div>
                  <dt>Relative Volume</dt>
                  <dd>{displayNumber(candidate.relativeVolume)}</dd>
                  <small>Score: {displayNumber(candidate.relativeVolumeScore, 0)}</small>
                </div>
                <div>
                  <dt>Performance Month</dt>
                  <dd>{displayPercent(candidate.performanceMonth)}</dd>
                  <small>Score: {displayNumber(candidate.performanceScore, 0)}</small>
                </div>
                <div>
                  <dt>RSI</dt>
                  <dd>{displayNumber(candidate.rsi)}</dd>
                  <small>Score: {displayNumber(candidate.rsiScore, 0)}</small>
                </div>
                <div>
                  <dt>SMA20</dt>
                  <dd>{displayNumber(candidate.sma20)}</dd>
                  <small>Score: {displayNumber(candidate.sma20Score, 0)}</small>
                </div>
              </FactGrid>
            </FactSection>

            <FactSection tone="risk">
              <header>
                <span aria-hidden="true">03</span>
                <div>
                  <h3>Momentum score</h3>
                  <p>Calculated by the existing backend Momentum scoring rules</p>
                </div>
              </header>
              <FactGrid columns={2}>
                <div>
                  <dt>Total score</dt>
                  <dd className="font-extrabold text-[#79e9b4]">
                    {displayNumber(candidate.momentumScore, 0)}
                  </dd>
                </div>
                <div>
                  <dt>Watchlist state</dt>
                  <dd>{candidate.watchlistStatus ?? 'Not watched'}</dd>
                </div>
              </FactGrid>
            </FactSection>
          </FactSections>

          <ActionColumn>
            <div className={actionCardClassName}>
              <div>
                <strong>Add to Watchlist</strong>
                <p>
                  Human selection remains required. The backend resolves the persisted ranking
                  candidate and applies the existing duplicate rule.
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [refreshingRanking, setRefreshingRanking] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await gateway.getMomentumRanking();
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

  const rankByKey = useMemo(() => {
    const entries =
      state.data?.items.map((candidate, index) => [candidateKey(candidate), index + 1] as const) ??
      [];
    return new Map(entries);
  }, [state.data?.items]);

  const sorters = useMemo<Record<DiscoverySortKey, typeof DISCOVERY_SORTERS.rank>>(
    () => ({
      ...DISCOVERY_SORTERS,
      rank: (left, right) =>
        (rankByKey.get(candidateKey(left)) ?? 0) - (rankByKey.get(candidateKey(right)) ?? 0)
    }),
    [rankByKey]
  );

  const table = useCockpitTable<MomentumRankingItemDto, DiscoverySortKey>({
    items: state.data?.items ?? [],
    getStatus: getDiscoveryStatus,
    defaultStatuses: DEFAULT_DISCOVERY_STATUSES,
    sortConfig: {
      defaultSortKey: 'rank',
      defaultSortDirection: 'asc',
      descendingByDefaultKeys: ['signalDate', 'price', 'relativeVolume', 'momentumScore']
    },
    sorters
  });

  const selectedCandidate =
    state.data?.items.find((candidate) => candidateKey(candidate) === selectedKey) ?? null;

  async function refreshSignals() {
    if (refreshingSignals) return;
    setRefreshingSignals(true);
    setFeedback(null);
    setActionError(null);
    try {
      const archived = await gateway.refreshFinviz();
      setFeedback(`${archived} Finviz signals refreshed. Refresh Ranking to rank latest signals.`);
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshingSignals(false);
    }
  }

  async function refreshRanking() {
    if (refreshingRanking) return;
    setRefreshingRanking(true);
    setFeedback(null);
    setActionError(null);
    try {
      await gateway.refreshMomentumRanking();
      await load();
      setFeedback('Momentum Breakout candidates refreshed from archived signals.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshingRanking(false);
    }
  }

  async function addCandidate(candidate: MomentumRankingItemDto) {
    const key = candidateKey(candidate);
    if (addingKey || candidate.watchlistStatus || !candidate.signalDate) return;

    setAddingKey(key);
    setFeedback(null);
    setActionError(null);
    try {
      const result = await gateway.addMomentumCandidateToWatchlist({
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
            Refresh provider signals, review the active strategy ranking, then manually add selected
            ideas to Watchlist.
          </PageSubtitle>
        </div>
        <PageActions>
          {state.data && <UpdatedAt>Updated {displayTimestamp(state.data.generatedAt)}</UpdatedAt>}
          <Button
            onClick={() => void refreshSignals()}
            disabled={state.loading || refreshingSignals}
          >
            <span aria-hidden="true">↻</span>
            {refreshingSignals ? 'Refreshing signals' : 'Refresh Signals'}
          </Button>
          <Button
            onClick={() => void refreshRanking()}
            disabled={state.loading || refreshingRanking}
          >
            <span aria-hidden="true">↻</span>
            {refreshingRanking ? 'Refreshing ranking' : 'Refresh Ranking'}
          </Button>
        </PageActions>
      </PageHeader>

      <DataPanel aria-label="Discovery strategies" className="mb-5">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#64758d] uppercase">
            Active strategy
          </span>
          <button
            type="button"
            aria-pressed="true"
            className="rounded-full border border-[#4ee1a0] bg-[rgba(78,225,160,0.14)] px-4 py-2 text-xs font-extrabold tracking-[0.08em] text-[#dfffee] uppercase"
          >
            Momentum Breakout
          </button>
          <span className="rounded-full border border-[#24384d] bg-[rgba(10,20,33,0.5)] px-4 py-2 text-xs font-extrabold tracking-[0.08em] text-[#64758d] uppercase">
            Quality Dip · later
          </span>
        </div>
      </DataPanel>

      {state.loading && !state.data && <LoadingState>Loading ranked candidates…</LoadingState>}

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
        <EmptyState icon="⌕" title="No Momentum candidates">
          Refresh Signals, then Refresh Ranking to populate Discovery from backend data.
        </EmptyState>
      )}

      {selectedCandidate && (
        <MomentumCandidateDetail
          candidate={selectedCandidate}
          adding={addingKey === candidateKey(selectedCandidate)}
          feedback={feedback}
          error={actionError}
          onAdd={() => void addCandidate(selectedCandidate)}
          onClose={() => setSelectedKey(null)}
        />
      )}

      {state.data && state.data.items.length > 0 && (
        <DataPanel aria-label="Momentum Breakout candidates">
          <CockpitStatusFilters
            totalCount={state.data.items.length}
            visibleCount={table.filteredItems.length}
            availableStatuses={table.availableStatuses}
            activeStatuses={table.activeStatuses}
            onToggleStatus={table.toggleStatus}
            onReset={table.resetStatuses}
            defaultLabel="Human selection"
          />
          <TableScroll>
            <Table className="min-w-[1220px] border-collapse tabular-nums">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Rank"
                      active={table.sortKey === 'rank'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('rank')}
                    />
                  </TableHead>
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
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Score"
                      active={table.sortKey === 'momentumScore'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('momentumScore')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Status"
                      active={table.sortKey === 'reviewStatus'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('reviewStatus')}
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
                    rank={rankByKey.get(candidateKey(candidate)) ?? 0}
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
            Adjust the status chips above or reset them to bring back active Discovery candidates.
          </EmptyState>
        )}
    </PageShell>
  );
}

function getDiscoveryStatus(candidate: MomentumRankingItemDto): string {
  return candidate.reviewStatus;
}
