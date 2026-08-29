import { useEffect, useRef, useState } from 'react';
import type { ClosePositionResponse, PositionItemDto } from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/cockpit';
import {
  actionCardClassName,
  ActionColumn,
  DetailBackdrop,
  DetailGrid,
  DetailHeader,
  DetailPanel,
  errorNoticeClassName,
  FactGrid,
  FactSection,
  FactSections,
  formLabelClassName,
  inputClassName,
  notesClassName
} from '@/components/ui/detail';
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
    <DetailBackdrop
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <DetailPanel
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="position-detail-title"
        tabIndex={-1}
      >
        <DetailHeader>
          <div>
            <Eyebrow>Open Position</Eyebrow>
            <h2 id="position-detail-title">{position.ticker}</h2>
            <p>
              {position.id} · Account {position.accountId || '—'}
            </p>
          </div>
          <Button onClick={onClose} disabled={submitting}>
            Close details
          </Button>
        </DetailHeader>

        <DetailGrid>
          <div className="min-w-0">
            <FactSections>
              <FactSection>
                <header>
                  <span aria-hidden="true">01</span>
                  <div>
                    <h3>Overview</h3>
                    <p>Position identity and workflow state</p>
                  </div>
                </header>
                <FactGrid columns={4}>
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
                    <dt>Strategy</dt>
                    <dd>{position.strategyName}</dd>
                    <small>
                      {position.strategyId} · v{position.strategyVersion}
                    </small>
                  </div>
                </FactGrid>
              </FactSection>
              <FactSection tone="price">
                <header>
                  <span aria-hidden="true">02</span>
                  <div>
                    <h3>Execution &amp; prices</h3>
                    <p>Planned values, confirmed fill and protective levels</p>
                  </div>
                </header>
                <FactGrid columns={4}>
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
                    <dt>Actual quantity</dt>
                    <dd>{displayNumber(position.actualQuantity, 0)}</dd>
                    <small>Actual execution quantity</small>
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
                </FactGrid>
              </FactSection>
              <FactSection tone="risk">
                <header>
                  <span aria-hidden="true">03</span>
                  <div>
                    <h3>Risk &amp; performance</h3>
                    <p>Persisted plan risk and indicative open-position values</p>
                  </div>
                </header>
                <FactGrid columns={4}>
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
                </FactGrid>
              </FactSection>
            </FactSections>

            {position.notes && (
              <div className={notesClassName}>
                <strong>Notes</strong>
                <p>{position.notes}</p>
              </div>
            )}
          </div>

          <ActionColumn aria-label="Position actions">
            <div className={`${actionCardClassName} flex-col items-stretch`}>
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
                <div className="grid w-full gap-[14px]">
                  <div>
                    <strong>Confirm actual exit</strong>
                    <p>
                      This closes the Position, creates its Journal entry when absent, and updates
                      the linked Watchlist.
                    </p>
                  </div>
                  <label className={formLabelClassName} htmlFor="position-exit-price">
                    Actual exit price
                  </label>
                  <input
                    className={inputClassName}
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
                    <div className={errorNoticeClassName} role="alert">
                      {error}
                    </div>
                  )}
                  <div className="flex justify-end gap-2.5">
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
          </ActionColumn>
        </DetailGrid>
      </DetailPanel>
    </DetailBackdrop>
  );
}
