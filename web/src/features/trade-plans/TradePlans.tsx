import { useCallback, useEffect, useState } from 'react';
import type { TradePlanItemDto, TradePlansDto } from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface TradePlansProps {
  gateway: CockpitGateway;
}

interface TradePlansState {
  data: TradePlansDto | null;
  loading: boolean;
  error: string | null;
}

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
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
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
        <strong className="ticker-cell">{plan.ticker}</strong>
        <span className="cell-detail">{plan.id}</span>
      </TableCell>
      <TableCell>{plan.accountId || '—'}</TableCell>
      <TableCell>
        <span>{plan.strategyName}</span>
        <span className="cell-detail">
          {plan.strategyId} · v{plan.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{displayDate(plan.createdAt)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(plan.entryPrice)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(plan.stopPrice)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(plan.targetPrice)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(plan.maxRisk)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(plan.positionSize, 0)}</TableCell>
      <TableCell>
        <Badge tone={statusTone(plan.status)}>{plan.status || '—'}</Badge>
      </TableCell>
      <TableCell className="row-action-cell">
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

  const selectedPlan = state.data?.items.find((plan) => plan.id === selectedId) ?? null;

  return (
    <main className="trade-plans-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Trading workflow</p>
          <h1>Trade Plans</h1>
          <p className="page-subtitle">Review persisted plans before execution</p>
        </div>
        <div className="page-actions">
          {state.data && (
            <p className="updated-at">Updated {displayTimestamp(state.data.generatedAt)}</p>
          )}
          <Button className="refresh-button" onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </div>
      </header>

      {state.loading && !state.data && (
        <section className="status-panel" aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
          Loading Trade Plans…
        </section>
      )}
      {state.error && (
        <section className="status-panel error-panel" role="alert">
          <div>
            <strong>Trade Plans unavailable</strong>
            <p>{state.error}</p>
          </div>
          <Button variant="retry" onClick={() => void load()}>
            Try again
          </Button>
        </section>
      )}
      {state.data && state.data.items.length === 0 && !state.error && (
        <section className="empty-panel">
          <span aria-hidden="true">◇</span>
          <h2>No Trade Plans</h2>
          <p>Plans created from Watchlist candidates will appear here.</p>
        </section>
      )}

      {selectedPlan && <TradePlanDetail plan={selectedPlan} onClose={() => setSelectedId(null)} />}

      {state.data && state.data.items.length > 0 && (
        <section className="trade-plans-panel" aria-label="Trade Plans">
          <div className="table-summary">
            <span>{state.data.items.length} plans</span>
            <small>Read-only</small>
          </div>
          <div className="table-scroll">
            <Table className="trade-plans-table">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Ticker</TableHead>
                  <TableHead scope="col">Account</TableHead>
                  <TableHead scope="col">Strategy</TableHead>
                  <TableHead scope="col">Plan date</TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Entry
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Stop
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Target
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Planned risk
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Size
                  </TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">
                    <span className="visually-hidden">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.data.items.map((plan) => (
                  <TradePlanRow key={plan.id} plan={plan} onOpen={() => setSelectedId(plan.id)} />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </main>
  );
}
