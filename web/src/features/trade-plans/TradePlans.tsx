import { useCallback, useEffect, useState } from 'react';
import type { TradePlanItemDto, TradePlansDto } from '@trading-cockpit/contracts';
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
import { TradePlanDetail } from './TradePlanDetail';
import { useCockpitTable } from '../shared/use-cockpit-table';

interface TradePlansProps {
  gateway: CockpitGateway;
}

interface TradePlansState {
  data: TradePlansDto | null;
  loading: boolean;
  error: string | null;
}

type TradePlanSortKey =
  | 'ticker'
  | 'accountId'
  | 'strategy'
  | 'createdAt'
  | 'entryPrice'
  | 'stopPrice'
  | 'targetPrice'
  | 'maxRisk'
  | 'positionSize'
  | 'status';

const DEFAULT_TRADE_PLAN_STATUSES = ['DRAFT'] as const;

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

function displayNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function toMillis(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function statusTone(status: string): 'positive' | 'muted' | 'planned' | 'watching' {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'READY') return 'positive';
  if (normalized === 'EXECUTED') return 'planned';
  if (normalized === 'CANCELLED') return 'muted';
  return 'watching';
}

function TradePlanRow({ plan, onOpen }: { plan: TradePlanItemDto; onOpen: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <strong className={tableTickerClassName}>{plan.ticker}</strong>
        <span className={tableDetailClassName}>{plan.id}</span>
      </TableCell>
      <TableCell>{plan.accountId || '—'}</TableCell>
      <TableCell>
        <span>{plan.strategyName}</span>
        <span className={tableDetailClassName}>
          {plan.strategyId} · v{plan.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{displayDate(plan.createdAt)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(plan.entryPrice)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(plan.stopPrice)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(plan.targetPrice)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(plan.maxRisk)}</TableCell>
      <TableCell className={numericCellClassName}>{displayNumber(plan.positionSize, 0)}</TableCell>
      <TableCell>
        <Badge tone={statusTone(plan.status)}>{plan.status || '—'}</Badge>
      </TableCell>
      <TableCell className={actionCellClassName}>
        <Button onClick={onOpen} aria-label={`View ${plan.ticker} Trade Plan`}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function TradePlans({ gateway }: TradePlansProps) {
  const [state, setState] = useState<TradePlansState>({ data: null, loading: true, error: null });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await gateway.getTradePlans();
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

  const table = useCockpitTable<TradePlanItemDto, TradePlanSortKey>({
    items: state.data?.items ?? [],
    getStatus: (plan: TradePlanItemDto) => plan.status,
    defaultStatuses: DEFAULT_TRADE_PLAN_STATUSES,
    sortConfig: {
      defaultSortKey: 'ticker',
      defaultSortDirection: 'asc',
      descendingByDefaultKeys: [
        'createdAt',
        'entryPrice',
        'stopPrice',
        'targetPrice',
        'maxRisk',
        'positionSize'
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
      createdAt: (left, right) => toMillis(left.createdAt) - toMillis(right.createdAt),
      entryPrice: (left, right) =>
        (left.entryPrice ?? Number.NEGATIVE_INFINITY) -
        (right.entryPrice ?? Number.NEGATIVE_INFINITY),
      stopPrice: (left, right) =>
        (left.stopPrice ?? Number.NEGATIVE_INFINITY) -
        (right.stopPrice ?? Number.NEGATIVE_INFINITY),
      targetPrice: (left, right) =>
        (left.targetPrice ?? Number.NEGATIVE_INFINITY) -
        (right.targetPrice ?? Number.NEGATIVE_INFINITY),
      maxRisk: (left, right) =>
        (left.maxRisk ?? Number.NEGATIVE_INFINITY) - (right.maxRisk ?? Number.NEGATIVE_INFINITY),
      positionSize: (left, right) =>
        (left.positionSize ?? Number.NEGATIVE_INFINITY) -
        (right.positionSize ?? Number.NEGATIVE_INFINITY),
      status: (left, right) =>
        String(left.status || '').localeCompare(String(right.status || ''), undefined, {
          sensitivity: 'base',
          numeric: true
        })
    }
  });

  const selectedPlan = state.data?.items.find((plan) => plan.id === selectedId) ?? null;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Trading workflow</Eyebrow>
          <PageTitle>Trade Plans</PageTitle>
          <PageSubtitle>Review persisted plans before execution</PageSubtitle>
        </div>
        <PageActions>
          {state.data && <UpdatedAt>Updated {displayTimestamp(state.data.generatedAt)}</UpdatedAt>}
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </PageActions>
      </PageHeader>

      {state.loading && !state.data && <LoadingState>Loading Trade Plans…</LoadingState>}
      {state.error && (
        <ErrorState
          title="Trade Plans unavailable"
          error={state.error}
          onRetry={() => void load()}
        />
      )}
      {state.data && state.data.items.length === 0 && !state.error && (
        <EmptyState icon="◇" title="No Trade Plans">
          Plans created from Watchlist candidates will appear here.
        </EmptyState>
      )}

      {selectedPlan && (
        <TradePlanDetail
          plan={selectedPlan}
          gateway={gateway}
          onClose={() => setSelectedId(null)}
          onExecuted={load}
        />
      )}

      {state.data && state.data.items.length > 0 && (
        <DataPanel aria-label="Trade Plans">
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
                      label="Plan date"
                      active={table.sortKey === 'createdAt'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('createdAt')}
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Entry"
                      active={table.sortKey === 'entryPrice'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('entryPrice')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Stop"
                      active={table.sortKey === 'stopPrice'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('stopPrice')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Target"
                      active={table.sortKey === 'targetPrice'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('targetPrice')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Planned risk"
                      active={table.sortKey === 'maxRisk'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('maxRisk')}
                      align="right"
                    />
                  </TableHead>
                  <TableHead scope="col" className={`${numericCellClassName} p-0`}>
                    <CockpitSortHeader
                      label="Size"
                      active={table.sortKey === 'positionSize'}
                      direction={table.sortDirection}
                      onClick={() => table.setSort('positionSize')}
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
                {table.filteredItems.map((plan) => (
                  <TradePlanRow key={plan.id} plan={plan} onOpen={() => setSelectedId(plan.id)} />
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </DataPanel>
      )}
    </PageShell>
  );
}
