import { useCallback, useEffect, useState } from 'react';
import type { WatchlistDto, WatchlistItemDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
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
import { WatchlistDetail } from './WatchlistDetail';

interface WatchlistProps {
  gateway: CockpitGateway;
}

interface WatchlistState {
  data: WatchlistDto | null;
  loading: boolean;
  error: string | null;
}

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

function statusTone(status: string): 'positive' | 'muted' | 'planned' | 'watching' {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'READY' || normalized === 'ENTERED') return 'positive';
  if (normalized === 'CLOSED' || normalized === 'REJECTED') return 'muted';
  if (normalized === 'PLANNED') return 'planned';
  return 'watching';
}

function WatchlistRow({ item, onOpen }: { item: WatchlistItemDto; onOpen: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <strong className="ticker-cell">{item.ticker}</strong>
        {item.company && <span className="cell-detail">{item.company}</span>}
      </TableCell>
      <TableCell>
        <span>{item.strategyName}</span>
        <span className="cell-detail">
          {item.strategyId} · v{item.strategyVersion}
        </span>
      </TableCell>
      <TableCell>{formattedDate(item.signalDate)}</TableCell>
      <TableCell>{item.sector ?? '—'}</TableCell>
      <TableCell className="numeric-cell">{formattedNumber(item.currentPrice)}</TableCell>
      <TableCell className="numeric-cell score-cell">
        {formattedNumber(item.momentumScore, 0)}
      </TableCell>
      <TableCell>
        <Badge tone={statusTone(item.status)}>{item.status || '—'}</Badge>
        {item.setupStatus && <span className="cell-detail">Setup: {item.setupStatus}</span>}
      </TableCell>
      <TableCell className="row-action-cell">
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

  const selectedCandidate = state.data?.items.find((item) => item.id === selectedId) ?? null;

  return (
    <main className="watchlist-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Trading workflow</p>
          <h1>Watchlist</h1>
          <p className="page-subtitle">Candidates under active review across trading strategies</p>
        </div>
        <div className="page-actions">
          {state.data && (
            <p className="updated-at">Updated {formattedTimestamp(state.data.generatedAt)}</p>
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
          Loading watchlist…
        </section>
      )}

      {state.error && (
        <section className="status-panel error-panel" role="alert">
          <div>
            <strong>Watchlist unavailable</strong>
            <p>{state.error}</p>
          </div>
          <Button variant="retry" onClick={() => void load()}>
            Try again
          </Button>
        </section>
      )}

      {state.data && state.data.items.length === 0 && !state.error && (
        <section className="empty-panel">
          <span aria-hidden="true">◎</span>
          <h2>No watchlist candidates</h2>
          <p>Candidates added from Google Sheets will appear here automatically.</p>
        </section>
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
          <section className="watchlist-panel" aria-label="Watchlist candidates">
            <div className="table-summary">
              <span>{state.data.items.length} candidates</span>
              <small>Read-only</small>
            </div>
            <div className="table-scroll">
              <Table className="watchlist-table">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Ticker</TableHead>
                    <TableHead scope="col">Strategy</TableHead>
                    <TableHead scope="col">Signal date</TableHead>
                    <TableHead scope="col">Sector</TableHead>
                    <TableHead scope="col" className="numeric-cell">
                      Current price
                    </TableHead>
                    <TableHead scope="col" className="numeric-cell">
                      Momentum
                    </TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">
                      <span className="visually-hidden">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.data.items.map((item) => (
                    <WatchlistRow item={item} key={item.id} onOpen={() => setSelectedId(item.id)} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
