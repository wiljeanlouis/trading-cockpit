import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  RecordCapitalTransactionRequest,
  TradingAccountDto,
  TradingConfigDto
} from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DataPanel,
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingState,
  PageActions,
  PageHeader,
  PageShell,
  PageSubtitle,
  PageTitle,
  TableScroll,
  TableSummary
} from '@/components/ui/cockpit';
import {
  formLabelClassName,
  inputClassName,
  noticeClassName,
  selectClassName,
  successNoticeClassName
} from '@/components/ui/detail';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface AdminProps {
  gateway: CockpitGateway;
}

interface AdminState {
  loading: boolean;
  error: string | null;
  accounts: TradingAccountDto[];
  tradingConfig: TradingConfigDto | null;
  finvizConfigured: boolean | null;
}

type CapitalTransactionType = RecordCapitalTransactionRequest['type'];

function formatBooleanBadgeTone(configured: boolean | null): 'positive' | 'muted' | 'watching' {
  if (configured === null) return 'watching';
  return configured ? 'positive' : 'muted';
}

export function Admin({ gateway }: AdminProps) {
  const [state, setState] = useState<AdminState>({
    loading: true,
    error: null,
    accounts: [],
    tradingConfig: null,
    finvizConfigured: null
  });
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'positive' | 'planned' | 'muted'>('positive');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [finvizToken, setFinvizToken] = useState('');
  const [capitalType, setCapitalType] = useState<CapitalTransactionType>('INITIAL_FUNDING');
  const [capitalAccountId, setCapitalAccountId] = useState('');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalNote, setCapitalNote] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [accountsResult, configResult, finvizResult] = await Promise.allSettled([
        gateway.getTradingAccounts(),
        gateway.getTradingConfig(),
        gateway.checkFinvizAuth()
      ]);

      const accounts =
        accountsResult.status === 'fulfilled' ? accountsResult.value.accounts : state.accounts;
      const config = configResult.status === 'fulfilled' ? configResult.value : state.tradingConfig;
      const finvizConfigured =
        finvizResult.status === 'fulfilled' ? finvizResult.value : state.finvizConfigured;

      setState({
        loading: false,
        error: null,
        accounts,
        tradingConfig: config,
        finvizConfigured
      });

      setCapitalAccountId((current) => current || accounts[0]?.id || '');
      if (accountsResult.status === 'rejected' && configResult.status === 'rejected') {
        setState((current) => ({
          ...current,
          error: `${accountsResult.reason instanceof Error ? accountsResult.reason.message : String(accountsResult.reason)} / ${configResult.reason instanceof Error ? configResult.reason.message : String(configResult.reason)}`
        }));
      }
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

  const accountOptions = useMemo(() => state.accounts, [state.accounts]);

  async function runAction(
    action: string,
    operation: () => Promise<unknown>,
    successMessage: string
  ) {
    if (busyAction) return;
    setBusyAction(action);
    setMessage(null);
    try {
      await operation();
      setMessage(successMessage);
      setMessageTone('positive');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setMessageTone('planned');
    } finally {
      setBusyAction(null);
    }
  }

  async function saveFinvizToken() {
    if (!finvizToken.trim()) {
      setMessage('Le token Finviz ne peut pas être vide.');
      setMessageTone('planned');
      return;
    }
    await runAction(
      'save-token',
      () => gateway.setFinvizToken(finvizToken.trim()),
      'Finviz token saved.'
    );
    setFinvizToken('');
  }

  async function handleCapitalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(capitalAmount);
    if (!capitalAccountId) {
      setMessage('Select an account first.');
      setMessageTone('planned');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage('Amount must be greater than 0.');
      setMessageTone('planned');
      return;
    }
    await runAction(
      'capital-transaction',
      () =>
        gateway.recordCapitalTransaction({
          type: capitalType,
          accountId: capitalAccountId,
          amount: parsedAmount,
          note: capitalNote.trim() || null
        }),
      'Capital transaction recorded.'
    );
    setCapitalAmount('');
    setCapitalNote('');
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Operational controls</Eyebrow>
          <PageTitle>Administration</PageTitle>
          <PageSubtitle>Minimum setup and maintenance workflows for React Cockpit V1</PageSubtitle>
        </div>
        <PageActions>
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Reload'}
          </Button>
        </PageActions>
      </PageHeader>

      {state.loading && !state.tradingConfig && (
        <LoadingState>Loading administration…</LoadingState>
      )}

      {state.error && (
        <ErrorState
          title="Administration unavailable"
          error={state.error}
          onRetry={() => void load()}
        />
      )}

      {!state.loading && (
        <div className="grid gap-5">
          <DataPanel aria-label="Signal and Finviz">
            <TableSummary>
              <span>Signal refresh and Finviz maintenance</span>
              <Badge tone={formatBooleanBadgeTone(state.finvizConfigured)}>
                {state.finvizConfigured === null
                  ? 'UNKNOWN'
                  : state.finvizConfigured
                    ? 'AUTH CONFIGURED'
                    : 'AUTH MISSING'}
              </Badge>
            </TableSummary>
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="grid gap-3">
                <div className={noticeClassName}>
                  Refresh Finviz rebuilds the market signal projection and archives new signals into
                  Watchlist.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      void runAction(
                        'refresh-finviz',
                        () => gateway.refreshFinviz(),
                        'Finviz refreshed.'
                      )
                    }
                    disabled={busyAction !== null}
                  >
                    Refresh Finviz
                  </Button>
                  <Button
                    onClick={() =>
                      void runAction(
                        'setup-momentum-ranking',
                        () => gateway.setupMomentumRanking(),
                        'Momentum ranking setup completed.'
                      )
                    }
                    disabled={busyAction !== null}
                  >
                    Setup Momentum Ranking
                  </Button>
                  <Button
                    onClick={() =>
                      void runAction(
                        'setup-strategies',
                        () => gateway.setupStrategies(),
                        'Strategies setup completed.'
                      )
                    }
                    disabled={busyAction !== null}
                  >
                    Setup Strategies
                  </Button>
                  <Button
                    onClick={() =>
                      void runAction(
                        'validate-strategies',
                        async () => {
                          const valid = await gateway.validateStrategies();
                          if (!valid) throw new Error('Validation returned false.');
                        },
                        'Strategies validated.'
                      )
                    }
                    disabled={busyAction !== null}
                  >
                    Validate Strategies
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 rounded-[13px] border border-[#22384d] bg-[rgba(11,23,38,0.75)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[#e4edf7]">Finviz token</strong>
                  <Badge tone={formatBooleanBadgeTone(state.finvizConfigured)}>
                    {state.finvizConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}
                  </Badge>
                </div>
                <label className={formLabelClassName} htmlFor="finviz-token">
                  Token
                </label>
                <input
                  id="finviz-token"
                  className={inputClassName}
                  type="password"
                  value={finvizToken}
                  onChange={(event) => setFinvizToken(event.target.value)}
                  placeholder="Paste Finviz token"
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <Button onClick={() => void saveFinvizToken()} disabled={busyAction !== null}>
                    Save token
                  </Button>
                  <Button
                    variant="retry"
                    onClick={() =>
                      void runAction(
                        'delete-token',
                        () => gateway.deleteFinvizToken(),
                        'Finviz token deleted.'
                      )
                    }
                    disabled={busyAction !== null}
                  >
                    Delete token
                  </Button>
                </div>
              </div>
            </div>
          </DataPanel>

          <DataPanel aria-label="Cockpit configuration">
            <TableSummary>
              <span>Cockpit configuration</span>
              <small>Global settings only; accounts own capital and risk</small>
            </TableSummary>
            <div className="grid gap-5 p-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    void runAction(
                      'setup-cockpit-config',
                      () => gateway.setupCockpitConfig(),
                      'Cockpit Config ready.'
                    )
                  }
                  disabled={busyAction !== null}
                >
                  Setup Cockpit Config
                </Button>
                <Button
                  onClick={() =>
                    void runAction(
                      'setup-trading-accounts',
                      () => gateway.setupTradingAccounts(),
                      'Trading Accounts ready.'
                    )
                  }
                  disabled={busyAction !== null}
                >
                  Setup Trading Accounts
                </Button>
              </div>
              {state.tradingConfig ? (
                state.tradingConfig.settings.length === 0 ? (
                  <EmptyState icon="⚙" title="No global Cockpit settings">
                    Account capital comes from Capital Ledger + Journal. Risk % Per Trade comes from
                    Accounts.
                  </EmptyState>
                ) : (
                  <TableScroll>
                    <Table className="min-w-[760px] border-collapse tabular-nums">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parameter</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.tradingConfig.settings.map((setting) => (
                          <TableRow key={setting.parameter}>
                            <TableCell>{setting.parameter}</TableCell>
                            <TableCell>{String(setting.value ?? '—')}</TableCell>
                            <TableCell>{setting.description || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableScroll>
                )
              ) : (
                <EmptyState icon="⚙" title="Cockpit Config missing">
                  Use Setup Cockpit Config to initialize the global settings table.
                </EmptyState>
              )}
            </div>
          </DataPanel>

          <DataPanel aria-label="Trading accounts">
            <TableSummary>
              <span>{state.accounts.length} trading account(s)</span>
              <small>Used for Trade Plan creation and capital ledger operations</small>
            </TableSummary>
            {accountOptions.length === 0 ? (
              <EmptyState icon="◎" title="No trading accounts">
                Use Setup Trading Accounts to initialize the account sheet.
              </EmptyState>
            ) : (
              <TableScroll>
                <Table className="min-w-[760px] border-collapse tabular-nums">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Base Currency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountOptions.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <strong>{account.id}</strong>
                        </TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell>{account.baseCurrency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScroll>
            )}
          </DataPanel>

          <DataPanel aria-label="Capital transactions">
            <TableSummary>
              <span>Capital ledger entry</span>
              <small>Initial funding, deposits and withdrawals</small>
            </TableSummary>
            <form className="grid gap-4 p-5" onSubmit={(event) => void handleCapitalSubmit(event)}>
              <div className="grid gap-4 min-[760px]:grid-cols-3">
                <label className="grid gap-2">
                  <span className={formLabelClassName}>Transaction type</span>
                  <select
                    className={selectClassName}
                    value={capitalType}
                    onChange={(event) =>
                      setCapitalType(event.target.value as CapitalTransactionType)
                    }
                  >
                    <option value="INITIAL_FUNDING">Initial Funding</option>
                    <option value="DEPOSIT">Deposit</option>
                    <option value="WITHDRAWAL">Withdrawal</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className={formLabelClassName}>Account</span>
                  <select
                    className={selectClassName}
                    value={capitalAccountId}
                    onChange={(event) => setCapitalAccountId(event.target.value)}
                  >
                    <option value="">Select an account</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.id} — {account.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className={formLabelClassName}>Amount</span>
                  <input
                    className={inputClassName}
                    type="number"
                    min="0"
                    step="any"
                    value={capitalAmount}
                    onChange={(event) => setCapitalAmount(event.target.value)}
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className={formLabelClassName}>Note</span>
                <input
                  className={inputClassName}
                  type="text"
                  value={capitalNote}
                  onChange={(event) => setCapitalNote(event.target.value)}
                  placeholder="Optional note"
                />
              </label>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={busyAction !== null}>
                  Record transaction
                </Button>
              </div>
            </form>
          </DataPanel>

          {message && (
            <div className={messageTone === 'positive' ? successNoticeClassName : noticeClassName}>
              {message}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
