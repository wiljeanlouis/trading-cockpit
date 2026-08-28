import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  CreateTradePlanResponse,
  TradingAccountDto,
  WatchlistItemDto
} from '@trading-cockpit/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const response = await gateway.createTradePlan({ watchlistId: candidate.id, accountId });
      setResult(response);
      if (response.kind === 'created') await onTradePlanCreated();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  const hasInvalidationLevel = candidate.invalidationLevel !== null;

  return (
    <div
      className="candidate-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="candidate-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-detail-title"
        tabIndex={-1}
      >
        <header className="detail-header">
          <div>
            <p className="eyebrow">Watchlist candidate</p>
            <h2 id="candidate-detail-title">{candidate.ticker}</h2>
            <p>{candidate.company ?? candidate.strategyName}</p>
          </div>
          <Button className="detail-close" onClick={onClose} aria-label="Close candidate details">
            Close
          </Button>
        </header>

        <div className="detail-grid">
          <dl className="candidate-facts">
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
              <dt>Signal date</dt>
              <dd>{displayDate(candidate.signalDate)}</dd>
            </div>
            <div>
              <dt>Momentum score</dt>
              <dd className="score-value">{displayNumber(candidate.momentumScore, 0)}</dd>
            </div>
            <div>
              <dt>Signal price</dt>
              <dd>{displayNumber(candidate.signalPrice)}</dd>
            </div>
            <div>
              <dt>Current price</dt>
              <dd>{displayNumber(candidate.currentPrice)}</dd>
            </div>
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
            <div>
              <dt>Earnings</dt>
              <dd>{displayDate(candidate.earningsDate)}</dd>
            </div>
            <div>
              <dt>Sector</dt>
              <dd>{candidate.sector ?? '—'}</dd>
            </div>
          </dl>

          <div className="trade-plan-card">
            <div>
              <p className="eyebrow">Next workflow step</p>
              <h3>Create Trade Plan</h3>
              <p className="form-help">
                Equity, account risk and sizing inputs are resolved by Trading Cockpit when the plan
                is created.
              </p>
            </div>

            {!hasInvalidationLevel && (
              <div className="inline-notice" role="status">
                Add an Invalidation Level in the Watchlist sheet before creating a Trade Plan.
              </div>
            )}

            {accountsState.error && (
              <div className="inline-error" role="alert">
                <span>{accountsState.error}</span>
                <Button variant="retry" onClick={() => void loadAccounts()}>
                  Retry accounts
                </Button>
              </div>
            )}

            <form onSubmit={(event) => void submit(event)}>
              <label htmlFor={`account-${candidate.id}`}>Trading account</label>
              <select
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

              <Button
                type="submit"
                disabled={
                  submitting ||
                  accountsState.loading ||
                  accountsState.accounts.length === 0 ||
                  !accountId ||
                  !hasInvalidationLevel ||
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
              <div className="inline-error" role="alert">
                {submitError}
              </div>
            )}
            {result && (
              <div
                className={result.kind === 'created' ? 'success-notice' : 'inline-notice'}
                role="status"
              >
                {feedbackText(result)}
              </div>
            )}
          </div>
        </div>

        {candidate.notes && (
          <div className="candidate-notes">
            <strong>Notes</strong>
            <p>{candidate.notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}
