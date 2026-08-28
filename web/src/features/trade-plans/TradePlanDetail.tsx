import { useEffect, useRef } from 'react';
import type { TradePlanItemDto } from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TradePlanDetailProps {
  plan: TradePlanItemDto;
  onClose: () => void;
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

export function TradePlanDetail({ plan, onClose }: TradePlanDetailProps) {
  const modalRef = useRef<HTMLElement>(null);

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
      </section>
    </div>
  );
}
