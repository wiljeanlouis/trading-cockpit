import { useEffect, useRef, useState } from 'react';
import type { ExecuteTradePlanResponse, TradePlanItemDto } from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';

interface TradePlanDetailProps {
  plan: TradePlanItemDto;
  gateway: CockpitGateway;
  onClose: () => void;
  onExecuted: () => Promise<void>;
}

function displayDate(value: string | null, includeTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {})
  }).format(date);
}

function displayNumber(value: number | null, digits = 2): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function displayPercent(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 2
  }).format(value);
}

function statusTone(status: string): 'positive' | 'muted' | 'planned' | 'watching' {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'READY') return 'positive';
  if (normalized === 'EXECUTED') return 'planned';
  if (normalized === 'CANCELLED') return 'muted';
  return 'watching';
}

export function TradePlanDetail({ plan, gateway, onClose, onExecuted }: TradePlanDetailProps) {
  const modalRef = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExecuteTradePlanResponse | null>(null);

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

  const canExecute = ['DRAFT', 'READY'].includes(plan.status.trim().toUpperCase());

  async function execute() {
    if (submitting || result) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await gateway.executeTradePlan({ tradePlanId: plan.id });
      setResult(response);
      setConfirming(false);
      if (response.kind === 'opened') await onExecuted();
    } catch (executionError) {
      setError(executionError instanceof Error ? executionError.message : String(executionError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="candidate-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="candidate-detail trade-plan-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-plan-detail-title"
        tabIndex={-1}
      >
        <header className="detail-header">
          <div>
            <p className="eyebrow">Trade Plan</p>
            <h2 id="trade-plan-detail-title">{plan.ticker}</h2>
            <p>
              {plan.id} · Account {plan.accountId || '—'}
            </p>
          </div>
          <Button className="detail-close" onClick={onClose} aria-label="Close Trade Plan details">
            Close
          </Button>
        </header>

        <dl className="candidate-facts trade-plan-facts">
          <div>
            <dt>Status</dt>
            <dd>
              <Badge tone={statusTone(plan.status)}>{plan.status || '—'}</Badge>
            </dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{plan.accountId || '—'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{displayDate(plan.createdAt, true)}</dd>
          </div>
          <div>
            <dt>Entry type</dt>
            <dd>{plan.entryType ?? '—'}</dd>
          </div>
          <div>
            <dt>Strategy</dt>
            <dd>{plan.strategyName}</dd>
            <small>
              {plan.strategyId} · v{plan.strategyVersion}
            </small>
          </div>
          <div>
            <dt>Signal date</dt>
            <dd>{displayDate(plan.signalDate)}</dd>
          </div>
          <div>
            <dt>Momentum score</dt>
            <dd className="score-value">{displayNumber(plan.momentumScore, 0)}</dd>
          </div>
          <div>
            <dt>Setup status</dt>
            <dd>{plan.setupStatus ?? '—'}</dd>
          </div>
          <div>
            <dt>Signal price</dt>
            <dd>{displayNumber(plan.signalPrice)}</dd>
          </div>
          <div>
            <dt>Reference price</dt>
            <dd>{displayNumber(plan.referencePrice)}</dd>
            <small>Snapshot, not a live quote</small>
          </div>
          <div>
            <dt>Breakout level</dt>
            <dd>{displayNumber(plan.breakoutLevel)}</dd>
          </div>
          <div>
            <dt>Invalidation level</dt>
            <dd>{displayNumber(plan.invalidationLevel)}</dd>
          </div>
          <div>
            <dt>Planned entry</dt>
            <dd>{displayNumber(plan.entryPrice)}</dd>
          </div>
          <div>
            <dt>Stop</dt>
            <dd>{displayNumber(plan.stopPrice)}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{displayNumber(plan.targetPrice)}</dd>
          </div>
          <div>
            <dt>Event risk</dt>
            <dd>{plan.eventRisk ?? '—'}</dd>
          </div>
          <div>
            <dt>Risk / share</dt>
            <dd>{displayNumber(plan.riskPerShare)}</dd>
          </div>
          <div>
            <dt>Reward / share</dt>
            <dd>{displayNumber(plan.rewardPerShare)}</dd>
          </div>
          <div>
            <dt>Reward / risk</dt>
            <dd>{displayNumber(plan.riskReward)}</dd>
          </div>
          <div>
            <dt>Planned risk</dt>
            <dd>{displayNumber(plan.maxRisk)}</dd>
          </div>
          <div>
            <dt>Position size</dt>
            <dd>{displayNumber(plan.positionSize, 0)}</dd>
          </div>
          <div>
            <dt>Planned capital</dt>
            <dd>{displayNumber(plan.positionValue)}</dd>
          </div>
          <div>
            <dt>Equity snapshot</dt>
            <dd>{displayNumber(plan.accountEquity)}</dd>
          </div>
          <div>
            <dt>Risk policy</dt>
            <dd>{displayPercent(plan.riskPercent)}</dd>
          </div>
        </dl>

        {plan.notes && (
          <div className="candidate-notes">
            <strong>Notes</strong>
            <p>{plan.notes}</p>
          </div>
        )}

        {canExecute && !result && (
          <div className="trade-plan-action-card">
            {!confirming ? (
              <>
                <div>
                  <strong>Open Position</strong>
                  <p>Create a Position through the existing Trading Cockpit execution workflow.</p>
                </div>
                <Button onClick={() => setConfirming(true)}>Execute Trade Plan</Button>
              </>
            ) : (
              <div className="execution-confirmation">
                <div>
                  <strong>Confirm Position creation</strong>
                  <p>
                    The existing workflow will use the persisted planned entry (
                    {displayNumber(plan.entryPrice)}) and position size (
                    {displayNumber(plan.positionSize, 0)}) as the Position execution values. No live
                    quote or brokerage fill is being used.
                  </p>
                </div>
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
                  <Button onClick={() => void execute()} disabled={submitting}>
                    {submitting ? 'Creating Position…' : 'Confirm & Create Position'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {result && (
          <div
            className={
              result.kind === 'opened'
                ? 'success-notice execution-result'
                : 'inline-notice execution-result'
            }
            role="status"
          >
            {result.kind === 'opened'
              ? `Position ${result.positionId} created for ${result.ticker}: ${displayNumber(result.actualQuantity, 0)} shares at ${displayNumber(result.actualEntry)}.`
              : `Position ${result.positionId} already exists for this Trade Plan.`}
          </div>
        )}
      </section>
    </div>
  );
}
