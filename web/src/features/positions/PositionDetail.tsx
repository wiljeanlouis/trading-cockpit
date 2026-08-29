import { useEffect, useRef, useState } from 'react';
import type { ClosePositionResponse, PositionItemDto } from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';

interface PositionDetailProps {
  position: PositionItemDto;
  gateway: CockpitGateway;
  onClose: () => void;
  onClosed: (result: ClosePositionResponse) => Promise<void>;
}

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date
  );
}

function displayNumber(value: number | null, digits = 2): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function displayPercent(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(
    value
  );
}

export function PositionDetail({ position, gateway, onClose, onClosed }: PositionDetailProps) {
  const modalRef = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [exitPrice, setExitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, submitting]);

  async function closePosition() {
    if (submitting) return;
    const parsedExitPrice = Number(exitPrice);
    if (!Number.isFinite(parsedExitPrice) || parsedExitPrice <= 0) {
      setError('Enter an actual exit price greater than 0.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await gateway.closePosition({
        positionId: position.id,
        exitPrice: parsedExitPrice
      });
      await onClosed(result);
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : String(closeError));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="candidate-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="candidate-detail position-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="position-detail-title"
        tabIndex={-1}
      >
        <header className="detail-header">
          <div>
            <p className="eyebrow">Open Position</p>
            <h2 id="position-detail-title">{position.ticker}</h2>
            <p>
              {position.id} · Account {position.accountId || '—'}
            </p>
          </div>
          <Button className="detail-close" onClick={onClose} disabled={submitting}>
            Close details
          </Button>
        </header>

        <dl className="candidate-facts trade-plan-facts">
          <div>
            <dt>Status</dt>
            <dd>
              <Badge tone="positive">{position.status}</Badge>
            </dd>
          </div>
          <div>
            <dt>Opened</dt>
            <dd>{displayDate(position.openedAt)}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{position.accountId || '—'}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{displayNumber(position.actualQuantity, 0)}</dd>
            <small>Actual execution quantity</small>
          </div>
          <div>
            <dt>Strategy</dt>
            <dd>{position.strategyName}</dd>
            <small>
              {position.strategyId} · v{position.strategyVersion}
            </small>
          </div>
          <div>
            <dt>Trade Plan</dt>
            <dd>{position.tradePlanId}</dd>
          </div>
          <div>
            <dt>Planned entry</dt>
            <dd>{displayNumber(position.plannedEntry)}</dd>
          </div>
          <div>
            <dt>Actual entry</dt>
            <dd>{displayNumber(position.actualEntry)}</dd>
            <small>Persisted execution value</small>
          </div>
          <div>
            <dt>Planned quantity</dt>
            <dd>{displayNumber(position.plannedQuantity, 0)}</dd>
          </div>
          <div>
            <dt>Initial stop</dt>
            <dd>{displayNumber(position.initialStop)}</dd>
          </div>
          <div>
            <dt>Current stop</dt>
            <dd>{displayNumber(position.currentStop)}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{displayNumber(position.target)}</dd>
          </div>
          <div>
            <dt>Planned max risk</dt>
            <dd>{displayNumber(position.plannedMaxRisk)}</dd>
          </div>
          <div>
            <dt>Planned reward / risk</dt>
            <dd>{displayNumber(position.plannedRiskReward)}</dd>
          </div>
          <div>
            <dt>Indicative price</dt>
            <dd>{displayNumber(position.currentPrice)}</dd>
            <small>GOOGLEFINANCE display value</small>
          </div>
          <div>
            <dt>Indicative unrealized P&amp;L</dt>
            <dd>{displayNumber(position.unrealizedPnl)}</dd>
            <small>{displayPercent(position.unrealizedPnlPercent)}</small>
          </div>
        </dl>

        {position.notes && (
          <div className="candidate-notes">
            <strong>Notes</strong>
            <p>{position.notes}</p>
          </div>
        )}

        <div className="trade-plan-action-card position-action-card">
          {!confirming ? (
            <>
              <div>
                <strong>Close Position</strong>
                <p>
                  Record an explicit exit through the backend workflow. The indicative price is
                  never used automatically.
                </p>
              </div>
              <Button onClick={() => setConfirming(true)}>Close Position</Button>
            </>
          ) : (
            <div className="execution-confirmation position-close-form">
              <div>
                <strong>Confirm actual exit</strong>
                <p>
                  This closes the Position, creates its Journal entry when absent, and updates the
                  linked Watchlist.
                </p>
              </div>
              <label htmlFor="position-exit-price">Actual exit price</label>
              <input
                id="position-exit-price"
                inputMode="decimal"
                type="number"
                min="0"
                step="any"
                value={exitPrice}
                onChange={(event) => setExitPrice(event.target.value)}
                disabled={submitting}
                autoFocus
              />
              {error && (
                <div className="inline-error" role="alert">
                  {error}
                </div>
              )}
              <div className="confirmation-actions">
                <Button
                  onClick={() => {
                    setConfirming(false);
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button onClick={() => void closePosition()} disabled={submitting}>
                  {submitting ? 'Closing Position…' : 'Confirm Close'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
