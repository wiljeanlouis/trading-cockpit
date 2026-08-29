import { useEffect, useRef, useState } from 'react';
import type { ExecuteTradePlanResponse, TradePlanItemDto } from '@trading-cockpit/contracts';
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
  notesClassName,
  noticeClassName,
  successNoticeClassName
} from '@/components/ui/detail';
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
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function displayPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
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
  const [entryPrice, setEntryPrice] = useState(plan.entryPrice?.toString() ?? '');
  const [stopPrice, setStopPrice] = useState(plan.stopPrice?.toString() ?? '');
  const [targetPrice, setTargetPrice] = useState(plan.targetPrice?.toString() ?? '');
  const [positionSize, setPositionSize] = useState('');
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [planningSaved, setPlanningSaved] = useState(false);

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

  useEffect(() => {
    setEntryPrice(plan.entryPrice?.toString() ?? '');
    setStopPrice(plan.stopPrice?.toString() ?? '');
    setTargetPrice(plan.targetPrice?.toString() ?? '');
  }, [plan.entryPrice, plan.stopPrice, plan.targetPrice]);

  const canEditPlanning = ['DRAFT', 'READY'].includes(plan.status.trim().toUpperCase());
  const canExecute = plan.executionEligibility.eligible;

  async function savePlanning() {
    if (savingPlanning || submitting) return;
    setSavingPlanning(true);
    setPlanningError(null);
    setPlanningSaved(false);
    try {
      await gateway.updateTradePlanPlanning({
        tradePlanId: plan.id,
        entryPrice: Number(entryPrice),
        stopPrice: Number(stopPrice),
        targetPrice: targetPrice.trim() ? Number(targetPrice) : null,
        positionSize: positionSize.trim() ? Number(positionSize) : null
      });
      await onExecuted();
      setPlanningSaved(true);
    } catch (saveError) {
      setPlanningError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSavingPlanning(false);
    }
  }

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
    <DetailBackdrop
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <DetailPanel
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-plan-detail-title"
        tabIndex={-1}
      >
        <DetailHeader>
          <div>
            <Eyebrow>Trade Plan</Eyebrow>
            <h2 id="trade-plan-detail-title">{plan.ticker}</h2>
            <p>
              {plan.id} · Account {plan.accountId || '—'}
            </p>
          </div>
          <Button onClick={onClose} aria-label="Close Trade Plan details">
            Close
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
                    <p>Workflow, strategy and signal context</p>
                  </div>
                </header>
                <FactGrid columns={3}>
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
                    <dd className="text-[19px]! font-extrabold! text-[#79e9b4]!">
                      {displayNumber(plan.momentumScore, 0)}
                    </dd>
                  </div>
                  <div>
                    <dt>Setup status</dt>
                    <dd>{plan.setupStatus ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Event risk</dt>
                    <dd>{plan.eventRisk ?? '—'}</dd>
                  </div>
                </FactGrid>
              </FactSection>

              <FactSection tone="price">
                <header>
                  <span aria-hidden="true">02</span>
                  <div>
                    <h3>Prices</h3>
                    <p>Signal, planned entry and exit levels</p>
                  </div>
                </header>
                <FactGrid columns={4}>
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
                    <dt>Actual execution / fill</dt>
                    <dd>Not stored on Trade Plan</dd>
                    <small>Recorded on the Position only after explicit execution</small>
                  </div>
                </FactGrid>
              </FactSection>

              <FactSection tone="risk">
                <header>
                  <span aria-hidden="true">03</span>
                  <div>
                    <h3>Risk &amp; sizing</h3>
                    <p>Backend-confirmed risk and position calculations</p>
                  </div>
                </header>
                <FactGrid columns={4}>
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
                </FactGrid>
              </FactSection>
            </FactSections>

            {plan.notes && (
              <div className={notesClassName}>
                <strong>Notes</strong>
                <p>{plan.notes}</p>
              </div>
            )}
          </div>

          <ActionColumn aria-label="Trade Plan actions">
            {canEditPlanning && !result && (
              <div className={`${actionCardClassName} grid! grid-cols-1! items-start! gap-[18px]!`}>
                <div className="max-w-[440px] py-1.5 [&_p]:mt-[9px] [&_p]:text-[13px] [&_p]:leading-[1.65] [&_strong]:text-[17px]">
                  <strong>Planning inputs</strong>
                  <p>
                    Planned Entry, Stop, optional Target and optional Position Size describe intent
                    only. Leave Position Size empty to use the backend proposal. Saving does not
                    create a Position or record an execution fill.
                  </p>
                </div>
                <form
                  className="grid w-full grid-cols-1 items-center gap-2 [&_button]:mt-2 [&_button]:min-h-11 [&_button]:text-sm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void savePlanning();
                  }}
                >
                  <label className={formLabelClassName} htmlFor="planned-entry">
                    Planned Entry
                  </label>
                  <input
                    className={`${inputClassName} min-h-[46px] text-[15px]`}
                    id="planned-entry"
                    type="number"
                    min="0"
                    step="any"
                    value={entryPrice}
                    onChange={(event) => setEntryPrice(event.target.value)}
                    disabled={savingPlanning || submitting}
                  />
                  <label className={formLabelClassName} htmlFor="planned-stop">
                    Stop Price
                  </label>
                  <input
                    className={`${inputClassName} min-h-[46px] text-[15px]`}
                    id="planned-stop"
                    type="number"
                    min="0"
                    step="any"
                    value={stopPrice}
                    onChange={(event) => setStopPrice(event.target.value)}
                    disabled={savingPlanning || submitting}
                  />
                  <label className={formLabelClassName} htmlFor="position-size-override">
                    Position Size <small>Optional override</small>
                  </label>
                  <input
                    className={`${inputClassName} min-h-[46px] text-[15px]`}
                    id="position-size-override"
                    type="number"
                    min="1"
                    step="1"
                    placeholder={
                      plan.positionSize === null
                        ? 'Calculated by backend'
                        : `Suggested: ${displayNumber(plan.positionSize, 0)}`
                    }
                    value={positionSize}
                    onChange={(event) => setPositionSize(event.target.value)}
                    disabled={savingPlanning || submitting}
                  />
                  <label className={formLabelClassName} htmlFor="planned-target">
                    Target Price <small>Optional</small>
                  </label>
                  <input
                    className={`${inputClassName} min-h-[46px] text-[15px]`}
                    id="planned-target"
                    type="number"
                    min="0"
                    step="any"
                    value={targetPrice}
                    onChange={(event) => setTargetPrice(event.target.value)}
                    disabled={savingPlanning || submitting}
                  />
                  {planningError && (
                    <div className={errorNoticeClassName} role="alert">
                      {planningError}
                    </div>
                  )}
                  {planningSaved && (
                    <div className={successNoticeClassName} role="status">
                      Planning saved. Calculated values reloaded from the backend.
                    </div>
                  )}
                  <Button type="submit" disabled={savingPlanning || submitting}>
                    {savingPlanning ? 'Saving Planning…' : 'Save Planning'}
                  </Button>
                </form>
              </div>
            )}

            {!canExecute && canEditPlanning && !result && (
              <div className={`${noticeClassName} flex flex-col items-start gap-4`} role="status">
                <strong>Execution unavailable</strong>
                <span>{plan.executionEligibility.reason ?? 'This Trade Plan is incomplete.'}</span>
              </div>
            )}

            {canExecute && !result && (
              <div className={`${actionCardClassName} flex-col items-stretch`}>
                {!confirming ? (
                  <>
                    <div>
                      <strong>Open Position</strong>
                      <p>
                        Create a Position through the existing Trading Cockpit execution workflow.
                      </p>
                    </div>
                    <Button onClick={() => setConfirming(true)}>Execute Trade Plan</Button>
                  </>
                ) : (
                  <div className="grid w-full gap-[14px]">
                    <div>
                      <strong>Confirm Position creation</strong>
                      <p>
                        The existing workflow will use the persisted planned entry (
                        {displayNumber(plan.entryPrice)}) and position size (
                        {displayNumber(plan.positionSize, 0)}) as the Position execution values. No
                        live quote or brokerage fill is being used.
                      </p>
                    </div>
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
                className={result.kind === 'opened' ? successNoticeClassName : noticeClassName}
                role="status"
              >
                {result.kind === 'opened'
                  ? `Position ${result.positionId} created for ${result.ticker}: ${displayNumber(result.actualQuantity, 0)} shares at ${displayNumber(result.actualEntry)}.`
                  : `Position ${result.positionId} already exists for this Trade Plan.`}
              </div>
            )}
          </ActionColumn>
        </DetailGrid>
      </DetailPanel>
    </DetailBackdrop>
  );
}
