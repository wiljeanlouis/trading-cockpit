import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  AdminAccountDto,
  AdminOverviewDto,
  CapitalTransactionType,
  CreateFundedTradingAccountRequest,
  CreateStrategyRequest,
  CreateStrategyVersionRequest,
  RecordCapitalTransactionRequest,
  StrategyDto,
  StrategyVersionDto
} from '@trading-cockpit/contracts';
import { toast } from 'sonner';
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
  selectClassName
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

interface StrategyFormState {
  strategyId: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
}

interface StrategyVersionFormState {
  strategyId: string;
  version: string;
  enabled: boolean;
  screenerCode: string;
  screener: 'FINVIZ';
  finvizUrl: string;
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

const EMPTY_STRATEGY_FORM: StrategyFormState = {
  strategyId: '',
  name: '',
  type: 'MOMENTUM',
  enabled: true,
  description: ''
};

const EMPTY_STRATEGY_VERSION_FORM: StrategyVersionFormState = {
  strategyId: '',
  version: '',
  enabled: true,
  screenerCode: '',
  screener: 'FINVIZ',
  finvizUrl: ''
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

/**
 * Administration coordinates provider credentials, account funding/risk settings and strategy
 * configuration while leaving all authoritative validation to the backend.
 */
export function Admin({ gateway }: AdminProps) {
  const [state, setState] = useState<AdminState>({
    loading: true,
    error: null,
    overview: null
  });
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
  const [createStrategyOpen, setCreateStrategyOpen] = useState(false);
  const [createStrategyForm, setCreateStrategyForm] =
    useState<StrategyFormState>(EMPTY_STRATEGY_FORM);
  const [managedStrategyId, setManagedStrategyId] = useState<string | null>(null);
  const [strategyForm, setStrategyForm] = useState<StrategyFormState>(EMPTY_STRATEGY_FORM);
  const [versionForm, setVersionForm] = useState<StrategyVersionFormState>(
    EMPTY_STRATEGY_VERSION_FORM
  );

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
  const strategies = state.overview?.strategies ?? [];
  const managedAccount = useMemo(
    () => accounts.find((account) => account.id === managedAccountId) ?? null,
    [accounts, managedAccountId]
  );
  const managedStrategy = useMemo(
    () => strategies.find((strategy) => strategy.strategyId === managedStrategyId) ?? null,
    [strategies, managedStrategyId]
  );

  /**
   * Wraps Admin mutations with one busy state, toast feedback and backend-confirmed refresh.
   */
  async function runAction(
    action: string,
    operation: () => Promise<unknown>,
    successMessage: string
  ): Promise<boolean> {
    if (busyAction) return false;
    setBusyAction(action);
    try {
      await operation();
      toast.success(successMessage);
      await load();
      return true;
    } catch (error) {
      toast.error(failureText(error));
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  async function saveFinvizToken() {
    if (!finvizToken.trim()) {
      toast.warning('Le token Finviz ne peut pas être vide.');
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
    setCreateAccountForm(EMPTY_CREATE_ACCOUNT_FORM);
    setCreateAccountOpen(true);
  }

  function openManageAccount(account: AdminAccountDto) {
    setManagedAccountId(account.id);
    setAccountSettingsForm({
      name: account.name,
      riskPercent: riskPercentInputValue(account)
    });
    setCapitalForm(EMPTY_CAPITAL_FORM);
  }

  function openCreateStrategy() {
    setCreateStrategyForm(EMPTY_STRATEGY_FORM);
    setCreateStrategyOpen(true);
  }

  function openManageStrategy(strategy: StrategyDto) {
    setManagedStrategyId(strategy.strategyId);
    setStrategyForm({
      strategyId: strategy.strategyId,
      name: strategy.name,
      type: strategy.type,
      enabled: strategy.enabled,
      description: strategy.description
    });
    setVersionForm({
      ...EMPTY_STRATEGY_VERSION_FORM,
      strategyId: strategy.strategyId,
      screenerCode: `${strategy.strategyId}_V${strategy.versions.length + 1}`
    });
  }

  /**
   * Creates an account and its initial funding transaction as one backend workflow.
   */
  async function handleCreateAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const riskPercentPerTrade = parseRiskPercentInput(createAccountForm.riskPercent);
    const initialAmount = parsePositiveNumber(createAccountForm.initialAmount);
    if (!Number.isFinite(riskPercentPerTrade)) {
      toast.warning('Risk % Per Trade doit être un pourcentage supérieur à 0.');
      return;
    }
    if (!Number.isFinite(initialAmount)) {
      toast.warning('Initial Amount doit être supérieur à 0.');
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

  /**
   * Updates account identity/risk settings; capital remains owned by Capital Ledger transactions.
   */
  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedAccount) return;
    const riskPercentPerTrade = parseRiskPercentInput(accountSettingsForm.riskPercent);
    if (!Number.isFinite(riskPercentPerTrade)) {
      toast.warning('Risk % Per Trade doit être un pourcentage supérieur à 0.');
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

  /**
   * Records external capital movement without allowing React to recalculate account equity.
   */
  async function handleCapitalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedAccount) return;
    const amount = parsePositiveNumber(capitalForm.amount);
    if (!Number.isFinite(amount)) {
      toast.warning('Amount must be greater than 0.');
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

  /**
   * Creates the stable Strategy identity; versioned screener configuration is added separately.
   */
  async function handleCreateStrategySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request: CreateStrategyRequest = { ...createStrategyForm };
    const created = await runAction(
      'create-strategy',
      () => gateway.createStrategy(request),
      'Strategy created.'
    );
    if (created) setCreateStrategyOpen(false);
  }

  async function handleStrategySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedStrategy) return;
    await runAction(
      `update-strategy-${managedStrategy.strategyId}`,
      () => gateway.updateStrategy({ ...strategyForm, strategyId: managedStrategy.strategyId }),
      'Strategy updated.'
    );
  }

  /**
   * Adds a Strategy Version configuration while preserving Strategy ID + Version as historical
   * identity once signals and workflow records reference it.
   */
  async function handleCreateVersionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managedStrategy) return;
    const request: CreateStrategyVersionRequest = {
      ...versionForm,
      strategyId: managedStrategy.strategyId
    };
    const created = await runAction(
      `create-version-${managedStrategy.strategyId}`,
      () => gateway.createStrategyVersion(request),
      'Strategy version created.'
    );
    if (created) {
      setVersionForm({
        ...EMPTY_STRATEGY_VERSION_FORM,
        strategyId: managedStrategy.strategyId
      });
    }
  }

  /**
   * Toggles one Strategy Version and relies on backend rules to enforce at most one active version
   * per Strategy ID and parent-strategy eligibility.
   */
  async function toggleStrategyVersion(version: StrategyVersionDto) {
    await runAction(
      `toggle-version-${version.strategyId}-${version.version}`,
      () =>
        gateway.updateStrategyVersion({
          strategyId: version.strategyId,
          version: version.version,
          enabled: !version.enabled
        }),
      `Strategy version ${!version.enabled ? 'enabled' : 'disabled'}.`
    );
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
                      'refresh-signals',
                      () => gateway.refreshAllSignals(),
                      'Signals refreshed.'
                    )
                  }
                  disabled={busyAction !== null}
                >
                  Refresh All Signals
                </Button>
              </div>
            </div>
          </DataPanel>

          <DataPanel aria-label="Strategies">
            <TableSummary>
              <span>{strategies.length} strategy configuration(s)</span>
              <Button onClick={openCreateStrategy} disabled={busyAction !== null}>
                + Add Strategy
              </Button>
            </TableSummary>
            <div className="grid gap-5 p-5">
              {strategies.length === 0 ? (
                <EmptyState icon="◇" title="No strategies">
                  Create a Strategy and an enabled Strategy Version before refreshing Discovery.
                </EmptyState>
              ) : (
                <TableScroll>
                  <Table className="min-w-[980px] border-collapse tabular-nums">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Active Version</TableHead>
                        <TableHead>Screener</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {strategies.map((strategy) => {
                        const activeVersion = strategy.versions.find((version) => version.enabled);
                        return (
                          <TableRow key={strategy.strategyId}>
                            <TableCell>
                              <strong>{strategy.name}</strong>
                              <div className="text-xs text-[#64758d]">{strategy.strategyId}</div>
                            </TableCell>
                            <TableCell>{strategy.type}</TableCell>
                            <TableCell>
                              <Badge tone={strategy.enabled ? 'positive' : 'muted'}>
                                {strategy.enabled ? 'ENABLED' : 'DISABLED'}
                              </Badge>
                            </TableCell>
                            <TableCell>{activeVersion?.version ?? '—'}</TableCell>
                            <TableCell>{activeVersion?.screener ?? '—'}</TableCell>
                            <TableCell>
                              <Button
                                className="px-3 py-2 text-xs"
                                onClick={() => openManageStrategy(strategy)}
                                disabled={busyAction !== null}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableScroll>
              )}
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
        </div>
      )}

      {createStrategyOpen && (
        <DetailBackdrop
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-strategy-title"
          onClick={() => {
            if (!busyAction) setCreateStrategyOpen(false);
          }}
        >
          <DetailPanel className="max-w-[840px]" onClick={(event) => event.stopPropagation()}>
            <DetailHeader>
              <div>
                <h2 id="create-strategy-title">Add Strategy</h2>
                <p>Create stable strategy identity. Versions hold screener configuration.</p>
              </div>
              <Button
                type="button"
                variant="retry"
                onClick={() => setCreateStrategyOpen(false)}
                disabled={busyAction !== null}
              >
                Close
              </Button>
            </DetailHeader>
            <form
              className="grid gap-4"
              onSubmit={(event) => void handleCreateStrategySubmit(event)}
            >
              <div className="grid gap-4 min-[760px]:grid-cols-2">
                <AccountInput
                  label="Strategy ID"
                  value={createStrategyForm.strategyId}
                  onChange={(strategyId) =>
                    setCreateStrategyForm((current) => ({ ...current, strategyId }))
                  }
                  placeholder="MOMENTUM_BREAKOUT"
                />
                <AccountInput
                  label="Name"
                  value={createStrategyForm.name}
                  onChange={(name) => setCreateStrategyForm((current) => ({ ...current, name }))}
                  placeholder="Momentum Breakout"
                />
                <AccountInput
                  label="Type"
                  value={createStrategyForm.type}
                  onChange={(type) => setCreateStrategyForm((current) => ({ ...current, type }))}
                  placeholder="MOMENTUM"
                />
                <BooleanField
                  label="Enabled"
                  checked={createStrategyForm.enabled}
                  onChange={(enabled) =>
                    setCreateStrategyForm((current) => ({ ...current, enabled }))
                  }
                />
              </div>
              <TextAreaField
                label="Description"
                value={createStrategyForm.description}
                onChange={(description) =>
                  setCreateStrategyForm((current) => ({ ...current, description }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busyAction !== null}>
                  Create Strategy
                </Button>
                <Button
                  type="button"
                  variant="retry"
                  onClick={() => setCreateStrategyOpen(false)}
                  disabled={busyAction !== null}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DetailPanel>
        </DetailBackdrop>
      )}

      {managedStrategy && (
        <DetailBackdrop
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-strategy-title"
          onClick={() => {
            if (!busyAction) setManagedStrategyId(null);
          }}
        >
          <DetailPanel onClick={(event) => event.stopPropagation()}>
            <DetailHeader>
              <div>
                <h2 id="manage-strategy-title">{managedStrategy.name}</h2>
                <p>{managedStrategy.strategyId}</p>
              </div>
              <Button
                type="button"
                variant="retry"
                onClick={() => setManagedStrategyId(null)}
                disabled={busyAction !== null}
              >
                Close
              </Button>
            </DetailHeader>
            <DetailGrid className="grid-cols-1 min-[1100px]:grid-cols-1">
              <FactSection>
                <header>
                  <span>STR</span>
                  <div>
                    <h3>Strategy identity</h3>
                    <p>Strategy ID is immutable once persisted in historical records.</p>
                  </div>
                </header>
                <form
                  className="grid gap-4 p-4"
                  onSubmit={(event) => void handleStrategySubmit(event)}
                >
                  <ReadOnlyField label="Strategy ID" value={managedStrategy.strategyId} />
                  <div className="grid gap-4 min-[760px]:grid-cols-2">
                    <AccountInput
                      label="Name"
                      value={strategyForm.name}
                      onChange={(name) => setStrategyForm((current) => ({ ...current, name }))}
                    />
                    <AccountInput
                      label="Type"
                      value={strategyForm.type}
                      onChange={(type) => setStrategyForm((current) => ({ ...current, type }))}
                    />
                    <BooleanField
                      label="Enabled"
                      checked={strategyForm.enabled}
                      onChange={(enabled) =>
                        setStrategyForm((current) => ({ ...current, enabled }))
                      }
                    />
                  </div>
                  <TextAreaField
                    label="Description"
                    value={strategyForm.description}
                    onChange={(description) =>
                      setStrategyForm((current) => ({ ...current, description }))
                    }
                  />
                  <Button type="submit" disabled={busyAction !== null}>
                    Save Strategy
                  </Button>
                </form>
              </FactSection>

              <FactSection tone="price">
                <header>
                  <span>VER</span>
                  <div>
                    <h3>Strategy versions</h3>
                    <p>Only one version can be active for a Strategy ID in V2.9.</p>
                  </div>
                </header>
                <div className="grid gap-4 p-4">
                  <form
                    className="grid gap-4 rounded-2xl border border-[#285043] bg-[rgba(8,38,32,0.52)] p-4"
                    onSubmit={(event) => void handleCreateVersionSubmit(event)}
                  >
                    <div className="grid gap-4 min-[760px]:grid-cols-2">
                      <AccountInput
                        label="Version"
                        value={versionForm.version}
                        onChange={(version) =>
                          setVersionForm((current) => ({ ...current, version }))
                        }
                        placeholder="V2"
                      />
                      <AccountInput
                        label="Screener Code"
                        value={versionForm.screenerCode}
                        onChange={(screenerCode) =>
                          setVersionForm((current) => ({ ...current, screenerCode }))
                        }
                        placeholder="MOMENTUM_BREAKOUT_V2"
                      />
                      <ReadOnlyField label="Screener" value="FINVIZ" />
                      <BooleanField
                        label="Enabled"
                        checked={versionForm.enabled}
                        onChange={(enabled) =>
                          setVersionForm((current) => ({ ...current, enabled }))
                        }
                      />
                    </div>
                    <TextAreaField
                      label="Finviz URL"
                      value={versionForm.finvizUrl}
                      onChange={(finvizUrl) =>
                        setVersionForm((current) => ({ ...current, finvizUrl }))
                      }
                    />
                    <Button type="submit" disabled={busyAction !== null}>
                      Add Strategy Version
                    </Button>
                  </form>
                  <div className="border-t border-[#1d3348] pt-4">
                    {managedStrategy.versions.length === 0 ? (
                      <p className="m-0 text-sm text-[#8ba0b7]">No versions configured.</p>
                    ) : (
                      <div className="grid gap-3">
                        {managedStrategy.versions.map((version) => (
                          <div
                            key={`${version.strategyId}-${version.version}`}
                            className="rounded-2xl border border-[#1d3348] bg-[rgba(10,20,33,0.72)] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <strong>{version.version}</strong>
                                <div className="text-xs text-[#64758d]">
                                  {version.screenerCode} · {version.screener}
                                </div>
                              </div>
                              <Button
                                type="button"
                                className="px-3 py-2 text-xs"
                                onClick={() => void toggleStrategyVersion(version)}
                                disabled={busyAction !== null}
                              >
                                {version.enabled ? 'Disable' : 'Enable'}
                              </Button>
                            </div>
                            <p className="mt-3 break-all text-xs text-[#8ba0b7]">
                              {version.finvizUrl}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </FactSection>
            </DetailGrid>
          </DetailPanel>
        </DetailBackdrop>
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

function BooleanField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={formLabelClassName}>{label}</span>
      <span className="flex min-h-10 items-center gap-3 rounded-[10px] border border-[#22384d] bg-[#071422] px-3 py-2 text-sm text-[#e5edf7]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        {checked ? 'Enabled' : 'Disabled'}
      </span>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={formLabelClassName}>{label}</span>
      <textarea
        className={`${inputClassName} min-h-24 resize-y`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
