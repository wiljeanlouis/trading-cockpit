import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  AdminAccountDto,
  AdminOverviewDto,
  CapitalTransactionType,
  CreateFundedTradingAccountRequest,
  RecordCapitalTransactionRequest
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
  DetailBackdrop,
  DetailGrid,
  DetailHeader,
  DetailPanel,
  FactGrid,
  FactSection,
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
  overview: AdminOverviewDto | null;
}

interface CreateAccountFormState {
  accountId: string;
  name: string;
  baseCurrency: string;
  riskPercent: string;
  initialAmount: string;
}

interface AccountSettingsFormState {
  name: string;
  riskPercent: string;
}

interface CapitalFormState {
  type: Exclude<CapitalTransactionType, 'INITIAL_FUNDING'>;
  amount: string;
  note: string;
}

const EMPTY_CREATE_ACCOUNT_FORM: CreateAccountFormState = {
  accountId: '',
  name: '',
  baseCurrency: 'USD',
  riskPercent: '0.5',
  initialAmount: ''
};

const EMPTY_CAPITAL_FORM: CapitalFormState = {
  type: 'DEPOSIT',
  amount: '',
  note: ''
};

function formatBooleanBadgeTone(configured: boolean | null): 'positive' | 'muted' | 'watching' {
  if (configured === null) return 'watching';
  return configured ? 'positive' : 'muted';
}

function formatRiskPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 3
  }).format(value);
}

function formatMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function riskPercentInputValue(account: AdminAccountDto): string {
  return Number.isFinite(account.riskPercentPerTrade)
    ? String(account.riskPercentPerTrade * 100)
    : '';
}

function parsePositiveNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function parseRiskPercentInput(value: string): number {
  const parsed = parsePositiveNumber(value);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed / 100;
}

export function Admin({ gateway }: AdminProps) {
  const [state, setState] = useState<AdminState>({
    loading: true,
    error: null,
    overview: null
  });
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'positive' | 'planned'>('positive');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [finvizToken, setFinvizToken] = useState('');
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [createAccountForm, setCreateAccountForm] =
    useState<CreateAccountFormState>(EMPTY_CREATE_ACCOUNT_FORM);
  const [managedAccountId, setManagedAccountId] = useState<string | null>(null);
  const [accountSettingsForm, setAccountSettingsForm] = useState<AccountSettingsFormState>({
    name: '',
    riskPercent: ''
  });
  const [capitalForm, setCapitalForm] = useState<CapitalFormState>(EMPTY_CAPITAL_FORM);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const overview = await gateway.getAdminOverview();
      setState({ loading: false, error: null, overview });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: failureText(error)
      }));
    }
  }, [gateway]);

  useEffect(() => {
    void load();
  }, [load]);

  const accounts = state.overview?.accounts ?? [];
  const managedAccount = useMemo(
    () => accounts.find((account) => account.id === managedAccountId) ?? null,
    [accounts, managedAccountId]
  );

  async function runAction(
    action: string,
    operation: () => Promise<unknown>,
    successMessage: string
  ): Promise<boolean> {
    if (busyAction) return false;
    setBusyAction(action);
    setMessage(null);
    try {
      await operation();
      setMessage(successMessage);
      setMessageTone('positive');
      await load();
      return true;
    } catch (error) {
      setMessage(failureText(error));
      setMessageTone('planned');
      return false;
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
    const saved = await runAction(
      'save-token',
      () => gateway.setFinvizToken(finvizToken.trim()),
      'Finviz token saved.'
    );
    if (saved) setFinvizToken('');
  }

  function openCreateAccount() {
    setMessage(null);
    setCreateAccountForm(EMPTY_CREATE_ACCOUNT_FORM);
    setCreateAccountOpen(true);
  }

  function openManageAccount(account: AdminAccountDto) {
    setMessage(null);
    setManagedAccountId(account.id);
    setAccountSettingsForm({
      name: account.name,
      riskPercent: riskPercentInputValue(account)
    });
    setCapitalForm(EMPTY_CAPITAL_FORM);
  }

  async function handleCreateAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const riskPercentPerTrade = parseRiskPercentInput(createAccountForm.riskPercent);
    const initialAmount = parsePositiveNumber(createAccountForm.initialAmount);
    if (!Number.isFinite(riskPercentPerTrade)) {
      setMessage('Risk % Per Trade doit être un pourcentage supérieur à 0.');
      setMessageTone('planned');
      return;
    }
    if (!Number.isFinite(initialAmount)) {
      setMessage('Initial Amount doit être supérieur à 0.');
      setMessageTone('planned');
      return;
    }

    const request: CreateFundedTradingAccountRequest = {
      accountId: createAccountForm.accountId,
      name: createAccountForm.name,
      baseCurrency: createAccountForm.baseCurrency,
      riskPercentPerTrade,
      initialAmount
    };
    const created = await runAction(
      'create-funded-account',
      () => gateway.createFundedTradingAccount(request),
      'Trading Account created and funded.'
    );
    if (created) setCreateAccountOpen(false);
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedAccount) return;
    const riskPercentPerTrade = parseRiskPercentInput(accountSettingsForm.riskPercent);
    if (!Number.isFinite(riskPercentPerTrade)) {
      setMessage('Risk % Per Trade doit être un pourcentage supérieur à 0.');
      setMessageTone('planned');
      return;
    }
    await runAction(
      `update-account-${managedAccount.id}`,
      () =>
        gateway.updateTradingAccount({
          accountId: managedAccount.id,
          name: accountSettingsForm.name,
          baseCurrency: managedAccount.baseCurrency,
          riskPercentPerTrade
        }),
      'Trading Account updated.'
    );
  }

  async function handleCapitalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedAccount) return;
    const amount = parsePositiveNumber(capitalForm.amount);
    if (!Number.isFinite(amount)) {
      setMessage('Amount must be greater than 0.');
      setMessageTone('planned');
      return;
    }
    const request: RecordCapitalTransactionRequest = {
      type: capitalForm.type,
      accountId: managedAccount.id,
      amount,
      note: capitalForm.note.trim() || null
    };
    const recorded = await runAction(
      `capital-${managedAccount.id}`,
      () => gateway.recordCapitalTransaction(request),
      `${capitalForm.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} recorded.`
    );
    if (recorded) setCapitalForm(EMPTY_CAPITAL_FORM);
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <Eyebrow>Operational controls</Eyebrow>
          <PageTitle>Administration</PageTitle>
          <PageSubtitle>Provider and Trading Account management</PageSubtitle>
        </div>
        <PageActions>
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Reload'}
          </Button>
        </PageActions>
      </PageHeader>

      {state.loading && !state.overview && <LoadingState>Loading administration…</LoadingState>}

      {state.error && (
        <ErrorState
          title="Administration unavailable"
          error={state.error}
          onRetry={() => void load()}
        />
      )}

      {state.overview && (
        <div className="grid gap-5">
          <DataPanel aria-label="Finviz">
            <TableSummary>
              <span>Finviz</span>
              <Badge tone={formatBooleanBadgeTone(state.overview.finviz.configured)}>
                {state.overview.finviz.configured ? 'AUTH CONFIGURED' : 'AUTH MISSING'}
              </Badge>
            </TableSummary>
            <div className="grid gap-3 p-5 lg:grid-cols-[minmax(220px,0.6fr)_minmax(0,1fr)] lg:items-end">
              <div>
                <p className="m-0 text-sm text-[#8ba0b7]">
                  Market data provider and authentication.
                </p>
              </div>
              <div className="grid gap-3 min-[760px]:grid-cols-[minmax(220px,1fr)_auto_auto_auto] min-[760px]:items-end">
                <label className="grid gap-2">
                  <span className={formLabelClassName}>Token</span>
                  <input
                    id="finviz-token"
                    className={inputClassName}
                    type="password"
                    value={finvizToken}
                    onChange={(event) => setFinvizToken(event.target.value)}
                    placeholder="Paste Finviz token"
                    autoComplete="off"
                  />
                </label>
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
              </div>
            </div>
          </DataPanel>

          <DataPanel aria-label="Trading accounts">
            <TableSummary>
              <span>{accounts.length} trading account(s)</span>
              <Button onClick={openCreateAccount} disabled={busyAction !== null}>
                + Add account
              </Button>
            </TableSummary>
            <div className="grid gap-5 p-5">
              {accounts.length === 0 ? (
                <EmptyState icon="◎" title="No trading accounts">
                  Create a funded Trading Account to make Dashboard, Analytics and Trade Plan sizing
                  operational.
                </EmptyState>
              ) : (
                <TableScroll>
                  <Table className="min-w-[880px] border-collapse tabular-nums">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Base Currency</TableHead>
                        <TableHead>Risk / Trade</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <strong>{account.id}</strong>
                          </TableCell>
                          <TableCell>{account.name}</TableCell>
                          <TableCell>{account.baseCurrency}</TableCell>
                          <TableCell>{formatRiskPercent(account.riskPercentPerTrade)}</TableCell>
                          <TableCell>
                            <Button
                              className="px-3 py-2 text-xs"
                              onClick={() => openManageAccount(account)}
                              disabled={busyAction !== null}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableScroll>
              )}
            </div>
          </DataPanel>

          {message && (
            <div className={messageTone === 'positive' ? successNoticeClassName : noticeClassName}>
              {message}
            </div>
          )}
        </div>
      )}

      {createAccountOpen && (
        <DetailBackdrop
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-account-title"
          onClick={() => {
            if (!busyAction) setCreateAccountOpen(false);
          }}
        >
          <DetailPanel className="max-w-[840px]" onClick={(event) => event.stopPropagation()}>
            <DetailHeader>
              <div>
                <h2 id="create-account-title">Add Trading Account</h2>
                <p>Create a Trading Account ready to use with its Initial Funding.</p>
              </div>
              <Button
                type="button"
                variant="retry"
                onClick={() => setCreateAccountOpen(false)}
                disabled={busyAction !== null}
              >
                Close
              </Button>
            </DetailHeader>
            <form
              className="grid gap-4"
              onSubmit={(event) => void handleCreateAccountSubmit(event)}
            >
              <div className="grid gap-4 min-[760px]:grid-cols-2">
                <AccountInput
                  label="Account ID"
                  value={createAccountForm.accountId}
                  onChange={(accountId) =>
                    setCreateAccountForm((current) => ({ ...current, accountId }))
                  }
                  placeholder="A1"
                />
                <AccountInput
                  label="Name"
                  value={createAccountForm.name}
                  onChange={(name) => setCreateAccountForm((current) => ({ ...current, name }))}
                  placeholder="10% Monthly"
                />
                <AccountInput
                  label="Base Currency"
                  value={createAccountForm.baseCurrency}
                  onChange={(baseCurrency) =>
                    setCreateAccountForm((current) => ({ ...current, baseCurrency }))
                  }
                  placeholder="USD"
                />
                <NumberInput
                  label="Risk / Trade (%)"
                  value={createAccountForm.riskPercent}
                  onChange={(riskPercent) =>
                    setCreateAccountForm((current) => ({ ...current, riskPercent }))
                  }
                  placeholder="0.5"
                />
                <NumberInput
                  label="Initial Amount"
                  value={createAccountForm.initialAmount}
                  onChange={(initialAmount) =>
                    setCreateAccountForm((current) => ({ ...current, initialAmount }))
                  }
                  placeholder="10000"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busyAction !== null}>
                  Create funded account
                </Button>
                <Button
                  type="button"
                  variant="retry"
                  onClick={() => setCreateAccountOpen(false)}
                  disabled={busyAction !== null}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DetailPanel>
        </DetailBackdrop>
      )}

      {managedAccount && (
        <DetailBackdrop
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-account-title"
          onClick={() => {
            if (!busyAction) setManagedAccountId(null);
          }}
        >
          <DetailPanel onClick={(event) => event.stopPropagation()}>
            <DetailHeader>
              <div>
                <h2 id="manage-account-title">{managedAccount.id}</h2>
                <p>{managedAccount.name}</p>
              </div>
              <Button
                type="button"
                variant="retry"
                onClick={() => setManagedAccountId(null)}
                disabled={busyAction !== null}
              >
                Close
              </Button>
            </DetailHeader>

            <DetailGrid>
              <div className="grid gap-5">
                <FactSection>
                  <header>
                    <span>CFG</span>
                    <div>
                      <h3>Account settings</h3>
                      <p>
                        Account ID is immutable. Base Currency is locked after account activity.
                      </p>
                    </div>
                  </header>
                  <form
                    className="grid gap-4 p-4"
                    onSubmit={(event) => void handleSettingsSubmit(event)}
                  >
                    <div className="grid gap-4 min-[760px]:grid-cols-2">
                      <ReadOnlyField label="Account ID" value={managedAccount.id} />
                      <ReadOnlyField label="Base Currency" value={managedAccount.baseCurrency} />
                      <AccountInput
                        label="Name"
                        value={accountSettingsForm.name}
                        onChange={(name) =>
                          setAccountSettingsForm((current) => ({ ...current, name }))
                        }
                      />
                      <NumberInput
                        label="Risk / Trade (%)"
                        value={accountSettingsForm.riskPercent}
                        onChange={(riskPercent) =>
                          setAccountSettingsForm((current) => ({ ...current, riskPercent }))
                        }
                      />
                    </div>
                    <Button type="submit" disabled={busyAction !== null}>
                      Save settings
                    </Button>
                  </form>
                </FactSection>

                <FactSection tone="price">
                  <header>
                    <span>$</span>
                    <div>
                      <h3>Financial summary</h3>
                      <p>Capital Ledger plus Journal realized P&amp;L.</p>
                    </div>
                  </header>
                  <FactGrid columns={3}>
                    <Metric
                      label="Initial Funding"
                      value={formatMoney(
                        managedAccount.financialSummary.initialFunding,
                        managedAccount.baseCurrency
                      )}
                    />
                    <Metric
                      label="Deposits"
                      value={formatMoney(
                        managedAccount.financialSummary.deposits,
                        managedAccount.baseCurrency
                      )}
                    />
                    <Metric
                      label="Withdrawals"
                      value={formatMoney(
                        managedAccount.financialSummary.withdrawals,
                        managedAccount.baseCurrency
                      )}
                    />
                    <Metric
                      label="Net External Capital"
                      value={formatMoney(
                        managedAccount.financialSummary.netExternalCapital,
                        managedAccount.baseCurrency
                      )}
                    />
                    <Metric
                      label="Realized P&L"
                      value={formatMoney(
                        managedAccount.financialSummary.realizedPnl,
                        managedAccount.baseCurrency
                      )}
                    />
                    <Metric
                      label="Realized Equity"
                      value={formatMoney(
                        managedAccount.financialSummary.realizedEquity,
                        managedAccount.baseCurrency
                      )}
                    />
                  </FactGrid>
                </FactSection>
              </div>

              <div className="grid gap-5">
                <FactSection tone="risk">
                  <header>
                    <span>CAP</span>
                    <div>
                      <h3>Deposit / Withdraw</h3>
                      <p>Initial Funding is recorded only when the account is created.</p>
                    </div>
                  </header>
                  <form
                    className="grid gap-4 p-4"
                    onSubmit={(event) => void handleCapitalSubmit(event)}
                  >
                    <label className="grid gap-2">
                      <span className={formLabelClassName}>Transaction Type</span>
                      <select
                        className={selectClassName}
                        value={capitalForm.type}
                        onChange={(event) =>
                          setCapitalForm((current) => ({
                            ...current,
                            type: event.target.value as CapitalFormState['type']
                          }))
                        }
                      >
                        <option value="DEPOSIT">Deposit</option>
                        <option value="WITHDRAWAL">Withdrawal</option>
                      </select>
                    </label>
                    <NumberInput
                      label="Amount"
                      value={capitalForm.amount}
                      onChange={(amount) => setCapitalForm((current) => ({ ...current, amount }))}
                    />
                    <AccountInput
                      label="Note"
                      value={capitalForm.note}
                      onChange={(note) => setCapitalForm((current) => ({ ...current, note }))}
                      placeholder="Optional note"
                    />
                    <Button type="submit" disabled={busyAction !== null}>
                      Record {capitalForm.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}
                    </Button>
                  </form>
                </FactSection>

                <FactSection>
                  <header>
                    <span>LOG</span>
                    <div>
                      <h3>Capital activity</h3>
                      <p>Newest transactions first.</p>
                    </div>
                  </header>
                  {managedAccount.capitalTransactions.length === 0 ? (
                    <div className="p-4 text-sm text-[#8ba0b7]">No capital transactions yet.</div>
                  ) : (
                    <TableScroll>
                      <Table className="min-w-[560px] border-collapse tabular-nums">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {managedAccount.capitalTransactions.map((transaction) => (
                            <TableRow key={transaction.transactionId}>
                              <TableCell>{formatDateTime(transaction.occurredAt)}</TableCell>
                              <TableCell>{transaction.type}</TableCell>
                              <TableCell>
                                {formatMoney(transaction.amount, managedAccount.baseCurrency)}
                              </TableCell>
                              <TableCell>{transaction.note || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableScroll>
                  )}
                </FactSection>
              </div>
            </DetailGrid>
          </DetailPanel>
        </DetailBackdrop>
      )}
    </PageShell>
  );
}

function AccountInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className={formLabelClassName}>{label}</span>
      <input
        className={inputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className={formLabelClassName}>{label}</span>
      <input
        className={inputClassName}
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <span className={formLabelClassName}>{label}</span>
      <div className="rounded-[10px] border border-[#22384d] bg-[#071422] px-3 py-2 text-sm text-[#e5edf7]">
        {value || '—'}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function failureText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
