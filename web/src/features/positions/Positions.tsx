import { useCallback, useEffect, useState } from 'react';
import type {
  ClosePositionResponse,
  OpenPositionsDto,
  PositionItemDto
} from '@trading-cockpit/contracts';
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
import { PositionDetail } from './PositionDetail';

interface PositionsProps {
  gateway: CockpitGateway;
}
interface PositionsState {
  data: OpenPositionsDto | null;
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

function PositionRow({ position, onOpen }: { position: PositionItemDto; onOpen: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <strong className="ticker-cell">{position.ticker}</strong>
        <span className="cell-detail">{position.id}</span>
      </TableCell>
      <TableCell>{position.accountId || '—'}</TableCell>
      <TableCell>
        <span>{position.strategyName}</span>
        <span className="cell-detail">
          {position.strategyId} · v{position.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{displayDate(position.openedAt)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(position.actualQuantity, 0)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(position.actualEntry)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(position.currentStop)}</TableCell>
      <TableCell className="numeric-cell">{displayNumber(position.target)}</TableCell>
      <TableCell className="numeric-cell">
        <span
          className={
            position.unrealizedPnl !== null && position.unrealizedPnl < 0
              ? 'negative-value'
              : 'positive-value'
          }
        >
          {displaySigned(position.unrealizedPnl)}
        </span>
      </TableCell>
      <TableCell>
        <Badge tone="positive">{position.status}</Badge>
      </TableCell>
      <TableCell className="row-action-cell">
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
  const selectedPosition = state.data?.items.find((position) => position.id === selectedId) ?? null;

  async function handleClosed(result: ClosePositionResponse) {
    setCloseResult(result);
    setSelectedId(null);
    await load();
  }

  return (
    <main className="positions-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Position management</p>
          <h1>Positions</h1>
          <p className="page-subtitle">Monitor open Positions and record explicit exits</p>
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
      {closeResult && (
        <section className="success-notice position-success" role="status">
          <strong>
            {closeResult.ticker} closed at {displayNumber(closeResult.exitPrice)}.
          </strong>
          {closeResult.realizedPnl !== null && (
            <span> Realized P&amp;L: {displaySigned(closeResult.realizedPnl)}.</span>
          )}
          <span> Journal {closeResult.journalCreated ? 'created' : 'already present'}.</span>
        </section>
      )}
      {state.loading && !state.data && (
        <section className="status-panel" aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
          Loading Positions…
        </section>
      )}
      {state.error && (
        <section className="status-panel error-panel" role="alert">
          <div>
            <strong>Positions unavailable</strong>
            <p>{state.error}</p>
          </div>
          <Button variant="retry" onClick={() => void load()}>
            Try again
          </Button>
        </section>
      )}
      {state.data && state.data.items.length === 0 && !state.error && (
        <section className="empty-panel">
          <span aria-hidden="true">↗</span>
          <h2>No open Positions</h2>
          <p>Positions created from executed Trade Plans will appear here.</p>
        </section>
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
        <section className="positions-panel" aria-label="Open Positions">
          <div className="table-summary">
            <span>{state.data.items.length} open positions</span>
            <small>Backend managed</small>
          </div>
          <div className="table-scroll">
            <Table className="positions-table">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Ticker</TableHead>
                  <TableHead scope="col">Account</TableHead>
                  <TableHead scope="col">Strategy</TableHead>
                  <TableHead scope="col">Opened</TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Quantity
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Actual entry
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Current stop
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Target
                  </TableHead>
                  <TableHead scope="col" className="numeric-cell">
                    Indicative P&amp;L
                  </TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">
                    <span className="visually-hidden">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.data.items.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    onOpen={() => setSelectedId(position.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </main>
  );
}
