import { useCallback, useEffect, useState } from 'react';
import type {
  ClosePositionResponse,
  OpenPositionsDto,
  PositionItemDto
} from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CockpitStatusFilters } from '@/components/ui/cockpit-table-filters';
import { CockpitSortHeader } from '@/components/ui/cockpit-sort-header';
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
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { PositionDetail } from './PositionDetail';
import { useCockpitTable } from '../shared/use-cockpit-table';

interface PositionsProps {
  gateway: CockpitGateway;
}
interface PositionsState {
  data: OpenPositionsDto | null;
  loading: boolean;
  error: string | null;
}

type PositionSortKey =
  | 'ticker'
  | 'accountId'
  | 'strategy'
  | 'openedAt'
  | 'actualQuantity'
  | 'actualEntry'
  | 'currentStop'
  | 'target'
  | 'unrealizedPnl'
  | 'status';

const DEFAULT_POSITION_STATUSES = ['OPEN'] as const;

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
  const formatted = displayNumber(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `−${formatted}` : formatted;
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
  if (normalized === 'READY' || normalized === 'OPEN') return 'positive';
  if (normalized === 'CLOSED' || normalized === 'STOPPED') return 'muted';
  if (normalized === 'PLANNED') return 'planned';
  return 'watching';
}

function PositionRow({ position, onOpen }: { position: PositionItemDto; onOpen: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <strong className={tableTickerClassName}>{position.ticker}</strong>
        <span className={tableDetailClassName}>{position.id}</span>
      </TableCell>
      <TableCell>{position.accountId || '—'}</TableCell>
      <TableCell>
        <span>{position.strategyName}</span>
        <span className={tableDetailClassName}>
          {position.strategyId} · v{position.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{displayDate(position.openedAt)}</TableCell>
      <TableCell className={numericCellClassName}>
        {displayNumber(position.actualQuantity, 0)}
      </TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(position.actualEntry)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(position.currentStop)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(position.target)}</TableCell>
      <TableCell className={numericCellClassName}>
        <span
          className={
            position.unrealizedPnl !== null && position.unrealizedPnl < 0
              ? 'text-[#ff9da8]'
              : 'text-[#79e9b4]'
          }
        >
          {displaySigned(position.unrealizedPnl)}
        </span>
      </TableCell>
      <TableCell>
        <Badge tone={statusTone(position.status)}>{position.status}</Badge>
      </TableCell>
      <TableCell className={actionCellClassName}>
        <Button onClick={onOpen} aria-label={`View ${position.ticker} Position`}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function Positions({ gateway }: PositionsProps) {
  const [state, setState] = useState<PositionsState>({ data: null, loading: true, error: null });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<ClosePositionResponse | null>(null);
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ data: await gateway.getOpenPositions(), loading: false, error: null });
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

  const table = useCockpitTable<PositionItemDto, PositionSortKey>({
    items: state.data?.items ?? [],
    getStatus: (position: PositionItemDto) => position.status,
    defaultStatuses: DEFAULT_POSITION_STATUSES,
    sortConfig: {
      defaultSortKey: 'openedAt',
      defaultSortDirection: 'desc',
      descendingByDefaultKeys: [
        'openedAt',
        'actualQuantity',
        'actualEntry',
        'currentStop',
        'target',
        'unrealizedPnl'
      ]
    },
    sorters: {
      ticker: (left, right) =>
        left.ticker.localeCompare(right.ticker, undefined, { sensitivity: 'base', numeric: true }),
      accountId: (left, right) =>
        String(left.accountId || '').localeCompare(String(right.accountId || ''), undefined, {
          sensitivity: 'base',
          numeric: true
        }),
      strategy: (left, right) =>
        left.strategyName.localeCompare(right.strategyName, undefined, {
          sensitivity: 'base',
          numeric: true
        }),
      openedAt: (left, right) => toMillis(left.openedAt) - toMillis(right.openedAt),
      actualQuantity: (left, right) =>
        (left.actualQuantity ?? Number.NEGATIVE_INFINITY) -
        (right.actualQuantity ?? Number.NEGATIVE_INFINITY),
      actualEntry: (left, right) =>
        (left.actualEntry ?? Number.NEGATIVE_INFINITY) -
        (right.actualEntry ?? Number.NEGATIVE_INFINITY),
      currentStop: (left, right) =>
        (left.currentStop ?? Number.NEGATIVE_INFINITY) -
        (right.currentStop ?? Number.NEGATIVE_INFINITY),
      target: (left, right) =>
        (left.target ?? Number.NEGATIVE_INFINITY) - (right.target ?? Number.NEGATIVE_INFINITY),
      unrealizedPnl: (left, right) =>
        (left.unrealizedPnl ?? Number.NEGATIVE_INFINITY) -
        (right.unrealizedPnl ?? Number.NEGATIVE_INFINITY),
      status: (left, right) =>
        String(left.status || '').localeCompare(String(right.status || ''), undefined, {
          sensitivity: 'base',
          numeric: true
        })
    }
  });

  const selectedPosition = state.data?.items.find((position) => position.id === selectedId) ?? null;

  async function handleClosed(result: ClosePositionResponse) {
    setCloseResult(result);
    setSelectedId(null);
    await load();
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Position management</Eyebrow>
          <PageTitle>Positions</PageTitle>
          <PageSubtitle>Monitor open Positions and record explicit exits</PageSubtitle>
        </div>
        <PageActions>
          {state.data && <UpdatedAt>Updated {displayTimestamp(state.data.generatedAt)}</UpdatedAt>}
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </PageActions>
      </PageHeader>
      {closeResult && (
        <section
          className="mb-[18px] rounded-[9px] border border-[#28634e] bg-[rgba(18,58,45,0.72)] px-3 py-[11px] text-[11px] leading-[1.45] text-[#7af0b9] [&_span]:mr-1 [&_strong]:mr-1"
          role="status"
        >
          <strong>
            {closeResult.ticker} closed at {displayNumber(closeResult.exitPrice)}.
          </strong>
          {closeResult.realizedPnl !== null && (
            <span> Realized P&amp;L: {displaySigned(closeResult.realizedPnl)}.</span>
          )}
          <span> Journal {closeResult.journalCreated ? 'created' : 'already present'}.</span>
        </section>
      )}
      {state.loading && !state.data && <LoadingState>Loading Positions…</LoadingState>}
      {state.error && (
        <ErrorState title="Positions unavailable" error={state.error} onRetry={() => void load()} />
      )}
      {state.data && state.data.items.length === 0 && !state.error && (
        <EmptyState icon="↗" title="No open Positions">
          Positions created from executed Trade Plans will appear here.
        </EmptyState>
      )}
      {selectedPosition && (
        <PositionDetail
          position={selectedPosition}
          gateway={gateway}
          onClose={() => setSelectedId(null)}
          onClosed={handleClosed}
        />
      )}
      {state.data && state.data.items.length > 0 && (
        <DataPanel aria-label="Open Positions">
          <CockpitStatusFilters
            totalCount={state.data.items.length}
            visibleCount={table.filteredItems.length}
            availableStatuses={table.availableStatuses}
            activeStatuses={table.activeStatuses}
            onToggleStatus={table.toggleStatus}
            onReset={table.resetStatuses}
          />
          <TableScroll>
            <Table className="min-w-[1280px] border-collapse tabular-nums">
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
                      label="Account"
                      active={table.sortKey === 'accountId'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('accountId')}
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
                      label="Opened"
                      active={table.sortKey === 'openedAt'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('openedAt')}
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Quantity"
                      active={table.sortKey === 'actualQuantity'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('actualQuantity')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Actual entry"
                      active={table.sortKey === 'actualEntry'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('actualEntry')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Current stop"
                      active={table.sortKey === 'currentStop'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('currentStop')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Target"
                      active={table.sortKey === 'target'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('target')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Indicative P&L"
                      active={table.sortKey === 'unrealizedPnl'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('unrealizedPnl')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className="p-0">
                    <CockpitSortHeader
                      label="Status"
                      active={table.sortKey === 'status'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('status')}
                    />
                  </TableHead>
                  <TableHead scope="col">
                    <span className={screenReaderOnlyClassName}>Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.filteredItems.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    onOpen={() => setSelectedId(position.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </DataPanel>
      )}
    </PageShell>
  );
}
