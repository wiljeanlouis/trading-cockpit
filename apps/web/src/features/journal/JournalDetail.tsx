import { useEffect, useRef } from 'react';
import type { JournalItemDto, JournalOutcomeDto } from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/cockpit';
import {
  DetailBackdrop,
  DetailHeader,
  DetailPanel,
  FactGrid,
  FactSection,
  FactSections
} from '@/components/ui/detail';

interface JournalDetailProps {
  entry: JournalItemDto;
  onClose: () => void;
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
  return value === null
    ? '—'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function displayPercent(value: number | null): string {
  return value === null
    ? '—'
    : new Intl.NumberFormat(undefined, {
        style: 'percent',
        maximumFractionDigits: 2
      }).format(value);
}

function outcomeTone(outcome: JournalOutcomeDto): 'positive' | 'muted' | 'planned' {
  if (outcome === 'WIN') return 'positive';
  if (outcome === 'LOSS') return 'planned';
  return 'muted';
}

function pnlClass(value: number | null): string {
  if (value !== null && value > 0) return 'text-[#79e9b4]!';
  if (value !== null && value < 0) return 'text-[#ff9da8]!';
  return 'text-[#b6c2d0]!';
}

export function JournalDetail({ entry, onClose }: JournalDetailProps) {
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
    <DetailBackdrop
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <DetailPanel
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-detail-title"
        tabIndex={-1}
      >
        <DetailHeader>
          <div>
            <Eyebrow>Completed trade</Eyebrow>
            <h2 id="journal-detail-title">{entry.ticker}</h2>
            <p>
              {entry.id} · Account {entry.accountId || '—'}
            </p>
          </div>
          <Button onClick={onClose}>Close details</Button>
        </DetailHeader>

        <div
          className="mb-[18px] flex items-center justify-between gap-3 rounded-[11px] border border-[#24453e] bg-[rgba(9,28,30,0.72)] px-4 py-[14px] max-[620px]:flex-col max-[620px]:items-start [&_i]:text-[#4ee1a0] [&_i]:not-italic max-[620px]:[&_i]:rotate-90 [&_small]:mt-1 [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:text-[11px] [&_small]:font-medium [&_small]:text-[#668098] [&_span]:min-w-0 [&_span]:text-[11px] [&_span]:font-bold [&_span]:text-[#b7c8d9]"
          aria-label="Trade lifecycle"
        >
          <span>
            Watchlist<small>{entry.watchlistId || '—'}</small>
          </span>
          <i aria-hidden="true">→</i>
          <span>
            Trade Plan<small>{entry.tradePlanId || '—'}</small>
          </span>
          <i aria-hidden="true">→</i>
          <span>
            Position<small>{entry.positionId || '—'}</small>
          </span>
          <i aria-hidden="true">→</i>
          <span>
            Journal<small>{entry.id}</small>
          </span>
        </div>

        <FactSections>
          <FactSection>
            <header>
              <span aria-hidden="true">01</span>
              <div>
                <h3>Trade context</h3>
                <p>Strategy, account and completed-trade timeline</p>
              </div>
            </header>
            <FactGrid columns={3}>
              <div>
                <dt>Strategy</dt>
                <dd>{entry.strategyName}</dd>
                <small>
                  {entry.strategyId} · v{entry.strategyVersion}
                </small>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{entry.accountId || '—'}</dd>
              </div>
              <div>
                <dt>Opened</dt>
                <dd>{displayDate(entry.openedAt)}</dd>
              </div>
              <div>
                <dt>Closed</dt>
                <dd>{displayDate(entry.closedAt)}</dd>
              </div>
              <div>
                <dt>Exit reason</dt>
                <dd>{entry.exitReason ?? '—'}</dd>
              </div>
              <div>
                <dt>Followed plan?</dt>
                <dd>{entry.followedPlan ?? '—'}</dd>
              </div>
            </FactGrid>
          </FactSection>
          <FactSection tone="price">
            <header>
              <span aria-hidden="true">02</span>
              <div>
                <h3>Execution &amp; prices</h3>
                <p>Planned levels and persisted entry/exit values</p>
              </div>
            </header>
            <FactGrid columns={3}>
              <div>
                <dt>Planned entry</dt>
                <dd>{displayNumber(entry.plannedEntry)}</dd>
              </div>
              <div>
                <dt>Actual entry</dt>
                <dd>{displayNumber(entry.actualEntry)}</dd>
              </div>
              <div>
                <dt>Actual exit</dt>
                <dd>{displayNumber(entry.exitPrice)}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{displayNumber(entry.quantity, 0)}</dd>
              </div>
              <div>
                <dt>Initial stop</dt>
                <dd>{displayNumber(entry.initialStop)}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{displayNumber(entry.target)}</dd>
              </div>
            </FactGrid>
          </FactSection>
          <FactSection tone="risk">
            <header>
              <span aria-hidden="true">03</span>
              <div>
                <h3>Outcome &amp; performance</h3>
                <p>Backend-confirmed result and planned risk context</p>
              </div>
            </header>
            <FactGrid columns={3}>
              <div>
                <dt>Outcome</dt>
                <dd>
                  <Badge tone={outcomeTone(entry.outcome)}>{entry.outcome ?? '—'}</Badge>
                </dd>
              </div>
              <div>
                <dt>Realized P&amp;L</dt>
                <dd className={pnlClass(entry.realizedPnl)}>{displayNumber(entry.realizedPnl)}</dd>
              </div>
              <div>
                <dt>R-Multiple</dt>
                <dd>
                  {displayNumber(entry.rMultiple)}
                  {entry.rMultiple !== null ? ' R' : ''}
                </dd>
              </div>
              <div>
                <dt>Return</dt>
                <dd>{displayPercent(entry.returnPercent)}</dd>
              </div>
              <div>
                <dt>Planned max risk</dt>
                <dd>{displayNumber(entry.plannedMaxRisk)}</dd>
              </div>
              <div>
                <dt>Planned reward / risk</dt>
                <dd>{displayNumber(entry.plannedRiskReward)}</dd>
              </div>
            </FactGrid>
          </FactSection>
        </FactSections>

        {(entry.executionNotes || entry.lessonsLearned) && (
          <div className="mt-[18px] grid grid-cols-2 gap-3 max-[620px]:grid-cols-1 [&_section]:rounded-[10px] [&_section]:border [&_section]:border-[#20364b] [&_section]:bg-[#0c1929] [&_section]:p-[15px] [&_strong]:text-[11px] [&_strong]:text-[#9fb0c4] [&_p]:mt-[7px] [&_p]:mb-0 [&_p]:text-xs [&_p]:leading-[1.55] [&_p]:text-[#74879e]">
            {entry.executionNotes && (
              <section>
                <strong>Execution notes</strong>
                <p>{entry.executionNotes}</p>
              </section>
            )}
            {entry.lessonsLearned && (
              <section>
                <strong>Lessons learned</strong>
                <p>{entry.lessonsLearned}</p>
              </section>
            )}
          </div>
        )}
      </DetailPanel>
    </DetailBackdrop>
  );
}
