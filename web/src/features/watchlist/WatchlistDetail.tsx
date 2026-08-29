import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  CreateTradePlanResponse,
  TradingAccountDto,
  WatchlistItemDto
} from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/cockpit';
import {
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
  selectClassName,
  successNoticeClassName
} from '@/components/ui/detail';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';

interface WatchlistDetailProps {
  candidate: WatchlistItemDto;
  gateway: CockpitGateway;
  onClose: () => void;
  onTradePlanCreated: () => Promise<void>;
}

interface AccountsState {
  accounts: TradingAccountDto[];
  loading: boolean;
  error: string | null;
}

const EVENT_RISK_OPTIONS = [
  '',
  'CLEAR',
  'EARNINGS SOON',
  'EARNINGS TODAY',
  'POST EARNINGS',
  'OTHER'
] as const;

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function displayNumber(value: number | null, digits = 2): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function feedbackText(result: CreateTradePlanResponse): string {
  return result.kind === 'created'
    ? `Trade Plan ${result.tradePlanId} created for ${result.ticker} in ${result.accountId}.`
    : `An active Trade Plan already exists for ${result.ticker} in ${result.accountId}: ${result.tradePlanId}.`;
}

export function WatchlistDetail({
  candidate,
  gateway,
  onClose,
  onTradePlanCreated
}: WatchlistDetailProps) {
  const [accountsState, setAccountsState] = useState<AccountsState>({
    accounts: [],
    loading: true,
    error: null
  });
  const [accountId, setAccountId] = useState('');
  const [breakoutLevel, setBreakoutLevel] = useState(
    candidate.breakoutLevel === null ? '' : String(candidate.breakoutLevel)
  );
  const [invalidationLevel, setInvalidationLevel] = useState(
    candidate.invalidationLevel === null ? '' : String(candidate.invalidationLevel)
  );
  const [eventRisk, setEventRisk] = useState(candidate.eventRisk ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateTradePlanResponse | null>(null);
  const modalRef = useRef<HTMLElement>(null);

  const loadAccounts = useCallback(async () => {
    setAccountsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await gateway.getTradingAccounts();
      setAccountsState({ accounts: data.accounts, loading: false, error: null });
      setAccountId((current) => current || data.accounts[0]?.id || '');
    } catch (error) {
      setAccountsState({
        accounts: [],
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [gateway]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId || submitting) return;

    const parsedBreakoutLevel = breakoutLevel.trim() === '' ? null : Number(breakoutLevel);
    const parsedInvalidationLevel = Number(invalidationLevel);
    if (
      (parsedBreakoutLevel !== null &&
        (!Number.isFinite(parsedBreakoutLevel) || parsedBreakoutLevel <= 0)) ||
      !Number.isFinite(parsedInvalidationLevel) ||
      parsedInvalidationLevel <= 0
    ) {
      setSubmitError('Breakout Level et Invalidation Level doivent être supérieurs à 0.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const response = await gateway.createTradePlan({
        watchlistId: candidate.id,
        accountId,
        breakoutLevel: parsedBreakoutLevel,
        invalidationLevel: parsedInvalidationLevel,
        eventRisk: eventRisk.trim() || null
      });
      setResult(response);
      if (response.kind === 'created') await onTradePlanCreated();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
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
        aria-labelledby="candidate-detail-title"
        tabIndex={-1}
      >
        <DetailHeader>
          <div>
            <Eyebrow>Watchlist candidate</Eyebrow>
            <h2 id="candidate-detail-title">{candidate.ticker}</h2>
            <p>{candidate.company ?? candidate.strategyName}</p>
          </div>
          <Button onClick={onClose} aria-label="Close candidate details">
            Close
          </Button>
        </DetailHeader>

        <DetailGrid>
          <FactSections>
            <FactSection>
              <header>
                <span aria-hidden="true">01</span>
                <div>
                  <h3>Overview</h3>
                  <p>Candidate identity and workflow state</p>
                </div>
              </header>
              <FactGrid columns={2}>
                <div>
                  <dt>Strategy</dt>
                  <dd>{candidate.strategyName}</dd>
                  <small>
                    {candidate.strategyId} · v{candidate.strategyVersion}
                  </small>
                </div>
                <div>
                  <dt>Watchlist status</dt>
                  <dd>
                    <Badge tone={candidate.status === 'PLANNED' ? 'planned' : 'watching'}>
                      {candidate.status || '—'}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt>Sector</dt>
                  <dd>{candidate.sector ?? '—'}</dd>
                </div>
                <div>
                  <dt>Earnings</dt>
                  <dd>{displayDate(candidate.earningsDate)}</dd>
                </div>
              </FactGrid>
            </FactSection>

            <FactSection tone="price">
              <header>
                <span aria-hidden="true">02</span>
                <div>
                  <h3>Signal &amp; momentum</h3>
                  <p>Persisted signal and indicative market context</p>
                </div>
              </header>
              <FactGrid columns={2}>
                <div>
                  <dt>Signal date</dt>
                  <dd>{displayDate(candidate.signalDate)}</dd>
                </div>
                <div>
                  <dt>Momentum score</dt>
                  <dd className="text-[19px]! font-extrabold! text-[#79e9b4]!">
                    {displayNumber(candidate.momentumScore, 0)}
                  </dd>
                </div>
                <div>
                  <dt>Signal price</dt>
                  <dd>{displayNumber(candidate.signalPrice)}</dd>
                </div>
                <div>
                  <dt>Current price</dt>
                  <dd>{displayNumber(candidate.currentPrice)}</dd>
                </div>
              </FactGrid>
            </FactSection>

            <FactSection tone="risk">
              <header>
                <span aria-hidden="true">03</span>
                <div>
                  <h3>Setup &amp; risk</h3>
                  <p>Levels and conditions used to assess the candidate</p>
                </div>
              </header>
              <FactGrid columns={2}>
                <div>
                  <dt>Breakout level</dt>
                  <dd>{displayNumber(candidate.breakoutLevel)}</dd>
                </div>
                <div>
                  <dt>Invalidation level</dt>
                  <dd>{displayNumber(candidate.invalidationLevel)}</dd>
                </div>
                <div>
                  <dt>Setup status</dt>
                  <dd>{candidate.setupStatus || '—'}</dd>
                </div>
                <div>
                  <dt>Event risk</dt>
                  <dd>{candidate.eventRisk ?? '—'}</dd>
                </div>
              </FactGrid>
            </FactSection>
          </FactSections>

          <div className="flex flex-col gap-4 rounded-[11px] border border-[#28473f] bg-[rgba(9,24,29,0.86)] p-5 [&_h3]:mt-0 [&_h3]:mb-2 [&_h3]:text-[19px] [&_h3]:font-bold [&_h3]:text-[#eefbf5]">
            <div>
              <Eyebrow>Next workflow step</Eyebrow>
              <h3>Create Trade Plan</h3>
              <p className="m-0 text-xs leading-[1.55] text-[#71869b]">
                Equity, account risk and sizing inputs are resolved by Trading Cockpit when the plan
                is created.
              </p>
            </div>

            {accountsState.error && (
              <div className={errorNoticeClassName} role="alert">
                <span>{accountsState.error}</span>
                <Button variant="retry" onClick={() => void loadAccounts()}>
                  Retry accounts
                </Button>
              </div>
            )}

            <form className="grid gap-2.5" onSubmit={(event) => void submit(event)}>
              <label className={formLabelClassName} htmlFor={`account-${candidate.id}`}>
                Trading account
              </label>
              <select
                className={selectClassName}
                id={`account-${candidate.id}`}
                value={accountId}
                onChange={(event) => {
                  setAccountId(event.target.value);
                  setResult(null);
                  setSubmitError(null);
                }}
                disabled={accountsState.loading || submitting}
                required
              >
                {accountsState.loading && <option value="">Loading accounts…</option>}
                {!accountsState.loading && accountsState.accounts.length === 0 && (
                  <option value="">No trading accounts available</option>
                )}
                {accountsState.accounts.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name} · {account.id} · {account.baseCurrency}
                  </option>
                ))}
              </select>

              <label className={formLabelClassName} htmlFor={`breakout-${candidate.id}`}>
                Breakout Level <small className="normal-case opacity-70">Optional</small>
              </label>
              <input
                className={inputClassName}
                id={`breakout-${candidate.id}`}
                type="number"
                min="0"
                step="any"
                value={breakoutLevel}
                onChange={(event) => {
                  setBreakoutLevel(event.target.value);
                  setResult(null);
                  setSubmitError(null);
                }}
                disabled={submitting}
              />

              <label className={formLabelClassName} htmlFor={`invalidation-${candidate.id}`}>
                Invalidation Level
              </label>
              <input
                className={inputClassName}
                id={`invalidation-${candidate.id}`}
                type="number"
                min="0"
                step="any"
                value={invalidationLevel}
                onChange={(event) => {
                  setInvalidationLevel(event.target.value);
                  setResult(null);
                  setSubmitError(null);
                }}
                disabled={submitting}
                required
              />

              <label className={formLabelClassName} htmlFor={`event-risk-${candidate.id}`}>
                Event Risk
              </label>
              <select
                className={selectClassName}
                id={`event-risk-${candidate.id}`}
                value={eventRisk}
                onChange={(event) => {
                  setEventRisk(event.target.value);
                  setResult(null);
                  setSubmitError(null);
                }}
                disabled={submitting}
              >
                {!EVENT_RISK_OPTIONS.includes(eventRisk as (typeof EVENT_RISK_OPTIONS)[number]) && (
                  <option value={eventRisk}>{eventRisk}</option>
                )}
                {EVENT_RISK_OPTIONS.map((value) => (
                  <option key={value || 'NONE'} value={value}>
                    {value || 'Not specified'}
                  </option>
                ))}
              </select>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  accountsState.loading ||
                  accountsState.accounts.length === 0 ||
                  !accountId ||
                  !invalidationLevel.trim() ||
                  result !== null
                }
              >
                {submitting
                  ? 'Creating Trade Plan…'
                  : result?.kind === 'created'
                    ? 'Trade Plan Created'
                    : result?.kind === 'duplicate'
                      ? 'Active Trade Plan Exists'
                      : 'Create Trade Plan'}
              </Button>
            </form>

            {submitError && (
              <div className={errorNoticeClassName} role="alert">
                {submitError}
              </div>
            )}
            {result && (
              <div
                className={result.kind === 'created' ? successNoticeClassName : noticeClassName}
                role="status"
              >
                {feedbackText(result)}
              </div>
            )}
          </div>
        </DetailGrid>

        {candidate.notes && (
          <div className={notesClassName}>
            <strong>Notes</strong>
            <p>{candidate.notes}</p>
          </div>
        )}
      </DetailPanel>
    </DetailBackdrop>
  );
}
