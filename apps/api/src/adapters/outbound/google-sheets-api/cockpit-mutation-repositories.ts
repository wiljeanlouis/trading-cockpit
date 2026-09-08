import { randomUUID } from 'node:crypto';
import {
  isActiveWatchlistStatus,
  sameWatchlistIdentity,
  watchlistIdentityOf,
  type WatchlistEntry,
  type WatchlistIdentity
} from '@trading-cockpit/core/domain/watchlist';
import { isActiveTradePlanStatus, type TradePlan } from '@trading-cockpit/core/domain/trade-plan';
import { isOpenPositionStatus, type Position } from '@trading-cockpit/core/domain/position';
import type { JournalEntry } from '@trading-cockpit/core/domain/journal-entry';
import {
  createCapitalTransaction,
  type CapitalTransaction
} from '@trading-cockpit/core/domain/capital-transaction';
import type {
  TradingAccount,
  TradingAccountRecord
} from '@trading-cockpit/core/domain/trading-account';
import type { TradingAccountRiskPolicy } from '@trading-cockpit/core/domain/trading-account-risk-policy';
import type {
  TradingStrategy,
  TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';
import type { RuntimePort } from '@trading-cockpit/core/ports/outbound/runtime-port';
import type { StrategyRepository } from '@trading-cockpit/core/ports/outbound/strategy-repository';
import type { WatchlistRepository } from '@trading-cockpit/core/ports/outbound/watchlist-repository';
import type { TradePlanRepository } from '@trading-cockpit/core/ports/outbound/trade-plan-repository';
import type { PositionRepository } from '@trading-cockpit/core/ports/outbound/position-repository';
import type { JournalRepository } from '@trading-cockpit/core/ports/outbound/journal-repository';
import type { CapitalTransactionRepository } from '@trading-cockpit/core/ports/outbound/capital-transaction-repository';
import type { TradingAccountRepository } from '@trading-cockpit/core/ports/outbound/trading-account-repository';
import type {
  TradingAccountManagementRepository,
  TradingAccountReferenceSummary
} from '@trading-cockpit/core/ports/outbound/trading-account-management-repository';
import type { TradingAccountRiskPolicyRepository } from '@trading-cockpit/core/ports/outbound/trading-account-risk-policy-repository';
import type { SignalHistoryRepository } from '@trading-cockpit/core/ports/outbound/signal-history-repository';
import type { MarketSignalProjection } from '@trading-cockpit/core/ports/outbound/market-signal-projection';
import type { TradingStrategyCatalog } from '@trading-cockpit/core/ports/outbound/trading-strategy-catalog';
import type { MarketSignalBatch, SignalSnapshot } from '@trading-cockpit/core/domain/market-signal';
import {
  FINVIZ_MOMENTUM_EXPORT_HEADERS,
  MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS,
  signalsHistoryHeaderForFinvizHeader
} from '@trading-cockpit/contracts';
import type { SheetsValuesClient } from './google-sheets-api-client';
import {
  readJournalEntries,
  readPositions,
  readStrategyRecords,
  readStrategyVersionRecords,
  readTradingAccounts,
  readTradePlans,
  readWatchlistEntries,
  SHEET_DEFINITIONS
} from './cockpit-query-readers';
import {
  textValue,
  valueByHeader,
  type RequestScopedSheets,
  type SheetTable
} from './sheets-api-table';

export const CAPITAL_LEDGER_HEADERS = [
  'Transaction ID',
  'Account ID',
  'Type',
  'Amount',
  'Occurred At',
  'Note'
] as const;

export interface MutationContext {
  sheets: RequestScopedSheets;
  writer: DeferredSheetsWriter;
  now: () => Date;
}

/**
 * Runtime adapter for Cloud Run mutations: core receives time/ID services without importing Node
 * APIs directly.
 */
export class NodeRuntime implements RuntimePort {
  constructor(private readonly clock: () => Date) {}
  now(): Date {
    return this.clock();
  }
  newId(): string {
    return randomUUID();
  }
}

/**
 * Collects Google Sheets writes during a mutation and flushes them after the use case succeeds.
 * This keeps controllers simple while making the non-transactional write boundary explicit.
 */
export class DeferredSheetsWriter {
  private readonly writes: Array<() => Promise<void>> = [];

  constructor(
    readonly dependencies: {
      sheetsClient: SheetsValuesClient;
      spreadsheetId: string;
    }
  ) {}

  append(range: string, values: unknown[][]): void {
    this.writes.push(async () => {
      requireWrite(this.dependencies.sheetsClient.appendValues, 'appendValues');
      await this.dependencies.sheetsClient.appendValues!({
        spreadsheetId: this.dependencies.spreadsheetId,
        range,
        values: serializeRows(values),
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS'
      });
    });
  }

  update(range: string, values: unknown[][]): void {
    this.writes.push(async () => {
      requireWrite(this.dependencies.sheetsClient.updateValues, 'updateValues');
      await this.dependencies.sheetsClient.updateValues!({
        spreadsheetId: this.dependencies.spreadsheetId,
        range,
        values: serializeRows(values),
        valueInputOption: 'USER_ENTERED'
      });
    });
  }

  batchUpdate(data: Array<{ range: string; values: unknown[][] }>): void {
    this.writes.push(async () => {
      requireWrite(this.dependencies.sheetsClient.batchUpdateValues, 'batchUpdateValues');
      await this.dependencies.sheetsClient.batchUpdateValues!({
        spreadsheetId: this.dependencies.spreadsheetId,
        data: data.map((entry) => ({ range: entry.range, values: serializeRows(entry.values) })),
        valueInputOption: 'USER_ENTERED'
      });
    });
  }

  async flush(): Promise<void> {
    for (const write of this.writes) {
      await write();
    }
  }
}

/**
 * Mutable Watchlist repository for Cloud Run commands, backed by request-loaded rows and deferred
 * Sheets API writes.
 */
export class CloudRunWatchlistRepository implements WatchlistRepository {
  private entries: WatchlistEntry[] | null = null;

  constructor(private readonly context: MutationContext) {}

  findById(id: string): WatchlistEntry | null {
    const normalizedId = textValue(id);
    return this.loaded().find((entry) => entry.id === normalizedId) ?? null;
  }

  findActiveByIdentity(identity: WatchlistIdentity): WatchlistEntry | null {
    return (
      this.loaded().find(
        (entry) =>
          sameWatchlistIdentity(watchlistIdentityOf(entry), identity) &&
          isActiveWatchlistStatus(entry.status)
      ) ?? null
    );
  }

  save(entry: WatchlistEntry): void {
    const rowNumber = this.loaded().length + 2;
    this.context.writer.append(SHEET_DEFINITIONS.watchlist.range, [
      watchlistEntryToRow(entry, rowNumber)
    ]);
    this.entries = [...this.loaded(), entry];
  }

  updateTradePlanningInputs(
    id: string,
    inputs: { breakoutLevel: number | null; invalidationLevel: number; eventRisk: string }
  ): void {
    const rowNumber = this.requireRowNumberById(id);
    this.context.writer.batchUpdate([
      {
        range: cellRange(SHEET_DEFINITIONS.watchlist.sheetName, rowNumber, 16),
        values: [[inputs.breakoutLevel ?? '']]
      },
      {
        range: cellRange(SHEET_DEFINITIONS.watchlist.sheetName, rowNumber, 18),
        values: [[inputs.invalidationLevel]]
      },
      {
        range: cellRange(SHEET_DEFINITIONS.watchlist.sheetName, rowNumber, 20),
        values: [[inputs.eventRisk]]
      }
    ]);
    this.entries = this.loaded().map((entry) =>
      entry.id === id
        ? {
            ...entry,
            breakoutLevel: inputs.breakoutLevel ?? '',
            invalidationLevel: inputs.invalidationLevel,
            eventRisk: inputs.eventRisk
          }
        : entry
    );
  }

  updateStatus(id: string, status: string): void {
    const rowNumber = this.requireRowNumberById(id);
    this.context.writer.update(cellRange(SHEET_DEFINITIONS.watchlist.sheetName, rowNumber, 14), [
      [status]
    ]);
    this.entries = this.loaded().map((entry) => (entry.id === id ? { ...entry, status } : entry));
  }

  private loaded(): WatchlistEntry[] {
    if (!this.entries) throw new Error('Watchlist repository must be loaded before use.');
    return this.entries;
  }

  async load(): Promise<this> {
    this.entries = await readWatchlistEntries(this.context.sheets);
    return this;
  }

  private requireRowNumberById(id: string): number {
    const index = this.loaded().findIndex((entry) => entry.id === textValue(id));
    if (index < 0) throw new Error(`Watchlist ID introuvable : ${id}`);
    return index + 2;
  }
}

/**
 * Mutable Trade Plan repository for planning/execution commands. It updates only the canonical
 * row ranges owned by the workflow and mirrors changes in memory for later use-case steps.
 */
export class CloudRunTradePlanRepository implements TradePlanRepository {
  private plans: TradePlan[] | null = null;

  constructor(private readonly context: MutationContext) {}

  findById(id: string): TradePlan | null {
    return this.loaded().find((plan) => plan.id === textValue(id)) ?? null;
  }

  findActiveByWatchlistIdAndAccountId(watchlistId: string, accountId: string): TradePlan | null {
    const normalizedWatchlistId = textValue(watchlistId);
    const normalizedAccountId = textValue(accountId).toUpperCase();
    return (
      this.loaded().find(
        (plan) =>
          plan.watchlistId === normalizedWatchlistId &&
          plan.accountId === normalizedAccountId &&
          isActiveTradePlanStatus(plan.status)
      ) ?? null
    );
  }

  save(tradePlan: TradePlan): void {
    const rowNumber = this.loaded().length + 2;
    this.context.writer.append(SHEET_DEFINITIONS.tradePlans.range, [
      tradePlanToRow(tradePlan, rowNumber)
    ]);
    this.plans = [...this.loaded(), tradePlan];
  }

  updatePlanning(tradePlan: TradePlan, options?: { positionSizeOverridden: boolean }): void {
    const rowNumber = this.requireRowNumberById(tradePlan.id);
    const updates = [
      {
        range: rowRange(SHEET_DEFINITIONS.tradePlans.sheetName, rowNumber, 17, 27),
        values: [
          tradePlanPlanningCells(tradePlan, rowNumber, Boolean(options?.positionSizeOverridden))
        ]
      }
    ];
    this.context.writer.batchUpdate(updates);
    this.plans = this.loaded().map((plan) => (plan.id === tradePlan.id ? tradePlan : plan));
  }

  updateStatus(id: string, status: string): void {
    const rowNumber = this.requireRowNumberById(id);
    this.context.writer.update(cellRange(SHEET_DEFINITIONS.tradePlans.sheetName, rowNumber, 28), [
      [status]
    ]);
    this.plans = this.loaded().map((plan) => (plan.id === id ? { ...plan, status } : plan));
  }

  async load(): Promise<this> {
    this.plans = await readTradePlans(this.context.sheets);
    return this;
  }

  private loaded(): TradePlan[] {
    if (!this.plans) throw new Error('Trade Plan repository must be loaded before use.');
    return this.plans;
  }

  private requireRowNumberById(id: string): number {
    const index = this.loaded().findIndex((plan) => plan.id === textValue(id));
    if (index < 0) throw new Error(`Trade Plan ID introuvable : ${id}`);
    return index + 2;
  }
}

/**
 * Mutable Position repository for execution and close workflows, preserving Position ID as the
 * aggregate identity while writing canonical row updates back to Sheets.
 */
export class CloudRunPositionRepository implements PositionRepository {
  private positions: Position[] | null = null;

  constructor(private readonly context: MutationContext) {}

  findById(id: string): Position | null {
    return this.loaded().find((position) => position.id === textValue(id)) ?? null;
  }

  findOpenByTradePlanId(tradePlanId: string): Position | null {
    const expected = textValue(tradePlanId);
    return (
      this.loaded().find(
        (position) => position.tradePlanId === expected && isOpenPositionStatus(position.status)
      ) ?? null
    );
  }

  save(position: Position): void {
    const rowNumber = this.loaded().length + 2;
    this.context.writer.append(SHEET_DEFINITIONS.positions.range, [
      positionToRow(position, rowNumber)
    ]);
    this.positions = [...this.loaded(), position];
  }

  close(position: Position): void {
    const rowNumber = this.requireRowNumberById(position.id);
    this.context.writer.batchUpdate([
      {
        range: rowRange(SHEET_DEFINITIONS.positions.sheetName, rowNumber, 21, 24),
        values: [[position.status, position.closedAt, position.exitPrice, position.realizedPnl]]
      }
    ]);
    this.positions = this.loaded().map((candidate) =>
      candidate.id === position.id ? position : candidate
    );
  }

  async load(): Promise<this> {
    this.positions = await readPositions(this.context.sheets);
    return this;
  }

  private loaded(): Position[] {
    if (!this.positions) throw new Error('Position repository must be loaded before use.');
    return this.positions;
  }

  private requireRowNumberById(id: string): number {
    const index = this.loaded().findIndex((position) => position.id === textValue(id));
    if (index < 0) throw new Error(`Position ID introuvable : ${id}`);
    return index + 2;
  }
}

/**
 * Mutable Journal repository used during position close/reconciliation to detect existing Journal
 * snapshots and append missing backend-confirmed trade history.
 */
export class CloudRunJournalRepository implements JournalRepository {
  private entries: JournalEntry[] | null = null;

  constructor(private readonly context: MutationContext) {}

  findByPositionId(positionId: string): JournalEntry | null {
    return this.findAllByPositionId(positionId)[0] ?? null;
  }

  findAllByPositionId(positionId: string): JournalEntry[] {
    const expected = textValue(positionId);
    return this.loaded().filter((entry) => entry.positionId === expected);
  }

  findClosedByAccountId(accountId: string): JournalEntry[] {
    const expected = textValue(accountId).toUpperCase();
    return this.loaded().filter((entry) => entry.accountId === expected);
  }

  save(entry: JournalEntry): void {
    const rowNumber = this.loaded().length + 2;
    this.context.writer.append(SHEET_DEFINITIONS.journal.range, [
      journalEntryToRow(entry, rowNumber)
    ]);
    this.entries = [...this.loaded(), entry];
  }

  async load(): Promise<this> {
    this.entries = await readJournalEntries(this.context.sheets);
    return this;
  }

  private loaded(): JournalEntry[] {
    if (!this.entries) throw new Error('Journal repository must be loaded before use.');
    return this.entries;
  }
}

/**
 * Capital Ledger repository for account funding flows. Account equity calculations consume these
 * records through core use cases rather than through React or HTTP controllers.
 */
export class CloudRunCapitalTransactionRepository implements CapitalTransactionRepository {
  private transactions: CapitalTransaction[] | null = null;

  constructor(private readonly context: MutationContext) {}

  save(transaction: CapitalTransaction): void {
    this.context.writer.append("'Capital Ledger'!A:F", [capitalTransactionToRow(transaction)]);
    this.transactions = [...this.loaded(), transaction];
  }

  findByAccountId(accountId: string): CapitalTransaction[] {
    const expected = textValue(accountId).toUpperCase();
    return this.loaded().filter((transaction) => transaction.accountId === expected);
  }

  async load(): Promise<this> {
    const table = await this.context.sheets.getTable({
      key: 'capitalLedger',
      sheetName: 'Capital Ledger',
      range: "'Capital Ledger'!A:F",
      requiredHeaders: CAPITAL_LEDGER_HEADERS,
      dateHeaders: ['Occurred At']
    });
    this.transactions = table.table.rows
      .filter((row) => row.some((value) => textValue(value)))
      .map((row) =>
        createCapitalTransaction({
          id: textValue(valueByHeader(table.table.headers, row, 'Transaction ID')),
          accountId: textValue(valueByHeader(table.table.headers, row, 'Account ID')),
          type: textValue(
            valueByHeader(table.table.headers, row, 'Type')
          ) as CapitalTransaction['type'],
          amount: Number(valueByHeader(table.table.headers, row, 'Amount')),
          occurredAt: valueByHeader(table.table.headers, row, 'Occurred At') as Date,
          note: textValue(valueByHeader(table.table.headers, row, 'Note'))
        })
      );
    return this;
  }

  private loaded(): CapitalTransaction[] {
    if (!this.transactions) throw new Error('Capital Ledger repository must be loaded before use.');
    return this.transactions;
  }
}

export class LoadedStrategyRepository implements StrategyRepository {
  constructor(
    private readonly strategies: readonly TradingStrategy[],
    private readonly versions: readonly TradingStrategyVersion[]
  ) {}
  existsById(strategyId: string): boolean {
    const expected = textValue(strategyId).toUpperCase();
    return this.strategies.some((strategy) => strategy.id === expected);
  }
  existsVersion(strategyId: string, version: string): boolean {
    const expectedId = textValue(strategyId).toUpperCase();
    const expectedVersion = textValue(version);
    return this.versions.some(
      (candidate) => candidate.strategyId === expectedId && candidate.version === expectedVersion
    );
  }
}

export class LoadedTradingAccountRiskPolicyRepository implements TradingAccountRiskPolicyRepository {
  constructor(private readonly policies: readonly TradingAccountRiskPolicy[]) {}
  findByAccountId(accountId: string): TradingAccountRiskPolicy | null {
    const expected = textValue(accountId).toUpperCase();
    return this.policies.find((policy) => policy.accountId === expected) ?? null;
  }
}

export class LoadedTradingAccountRepository implements TradingAccountRepository {
  constructor(private readonly accounts: readonly TradingAccount[]) {}
  findById(accountId: string): TradingAccount | null {
    const expected = textValue(accountId).toUpperCase();
    return this.accounts.find((account) => account.id === expected) ?? null;
  }
  findAll(): TradingAccount[] {
    return [...this.accounts];
  }
}

/**
 * Account administration repository that checks cross-sheet account references before updates
 * while keeping physical deletes out of the supported workflow.
 */
export class CloudRunTradingAccountManagementRepository implements TradingAccountManagementRepository {
  private accounts: TradingAccount[] | null = null;
  private accountTable: SheetTable | null = null;
  private referenceTables: SheetTable[] = [];

  constructor(private readonly context: MutationContext) {}

  async load(): Promise<this> {
    await this.context.sheets.batchLoad([
      SHEET_DEFINITIONS.accounts,
      SHEET_DEFINITIONS.tradePlans,
      SHEET_DEFINITIONS.positions,
      SHEET_DEFINITIONS.journal,
      SHEET_DEFINITIONS.capitalLedger
    ]);
    this.accounts = await readTradingAccounts(this.context.sheets);
    this.accountTable = (await this.context.sheets.getTable(SHEET_DEFINITIONS.accounts)).table;
    this.referenceTables = await Promise.all(
      [
        SHEET_DEFINITIONS.tradePlans,
        SHEET_DEFINITIONS.positions,
        SHEET_DEFINITIONS.journal,
        SHEET_DEFINITIONS.capitalLedger
      ].map(async (definition) => (await this.context.sheets.getTable(definition)).table)
    );
    return this;
  }

  findById(accountId: string) {
    const expected = textValue(accountId).toUpperCase();
    const account = this.loaded().find((candidate) => candidate.id === expected);
    if (!account) return null;
    const riskPercentPerTrade = this.riskPercentByAccountId().get(account.id);
    if (!Number.isFinite(riskPercentPerTrade)) {
      throw new Error(`Risk % Per Trade absent pour ${account.id}.`);
    }
    return { ...account, riskPercentPerTrade: riskPercentPerTrade as number };
  }

  create(account: TradingAccountRecord): void {
    this.context.writer.append(SHEET_DEFINITIONS.accounts.range, [tradingAccountToRow(account)]);
    this.accounts = [...this.loaded(), account];
  }

  createFunded(account: TradingAccountRecord, initialFunding: CapitalTransaction): void {
    const accountRowNumber = this.loadedAccountTable().rows.length + 2;
    const capitalRowNumber = this.referenceTables[3].rows.length + 2;
    this.context.writer.batchUpdate([
      {
        range: rowRange(SHEET_DEFINITIONS.accounts.sheetName, accountRowNumber, 1, 4),
        values: [tradingAccountToRow(account)]
      },
      {
        range: rowRange(SHEET_DEFINITIONS.capitalLedger.sheetName, capitalRowNumber, 1, 6),
        values: [capitalTransactionToRow(initialFunding)]
      }
    ]);
    this.accounts = [...this.loaded(), account];
    this.accountTable = {
      ...this.loadedAccountTable(),
      rows: [...this.loadedAccountTable().rows, tradingAccountToRow(account)]
    };
    this.referenceTables[3] = {
      ...this.referenceTables[3],
      rows: [...this.referenceTables[3].rows, capitalTransactionToRow(initialFunding)]
    };
  }

  update(account: TradingAccountRecord): void {
    const rowNumber = this.requireRowNumberById(account.id);
    this.context.writer.update(rowRange(SHEET_DEFINITIONS.accounts.sheetName, rowNumber, 1, 4), [
      tradingAccountToRow(account)
    ]);
    this.accounts = this.loaded().map((candidate) =>
      candidate.id === account.id ? account : candidate
    );
  }

  countReferences(accountId: string): TradingAccountReferenceSummary {
    const expected = textValue(accountId).toUpperCase();
    return {
      tradePlans: this.countAccountReferences(this.referenceTables[0], expected),
      positions: this.countAccountReferences(this.referenceTables[1], expected),
      journalEntries: this.countAccountReferences(this.referenceTables[2], expected),
      capitalTransactions: this.countAccountReferences(this.referenceTables[3], expected)
    };
  }

  private loaded(): TradingAccount[] {
    if (!this.accounts) throw new Error('Trading Account repository must be loaded before use.');
    return this.accounts;
  }

  private riskPercentByAccountId(): Map<string, number> {
    const table = this.loadedAccountTable();
    return new Map(
      table.rows
        .filter((row) => row.some((value) => textValue(value)))
        .map((row) => [
          textValue(valueByHeader(table.headers, row, 'Account ID')).toUpperCase(),
          Number(valueByHeader(table.headers, row, 'Risk % Per Trade'))
        ])
    );
  }

  private requireRowNumberById(id: string): number {
    const index = this.loaded().findIndex((account) => account.id === textValue(id).toUpperCase());
    if (index < 0) throw new Error(`Trading Account introuvable : ${id}`);
    return index + 2;
  }

  private countAccountReferences(table: SheetTable | undefined, accountId: string): number {
    if (!table) throw new Error('Trading Account reference tables must be loaded before use.');
    const accountColumn = table.headers.findIndex(
      (header) => header.trim().toLowerCase() === 'account id'
    );
    if (accountColumn < 0) return 0;
    return table.rows.filter((row) => textValue(row[accountColumn]).toUpperCase() === accountId)
      .length;
  }

  private loadedAccountTable(): SheetTable {
    if (!this.accountTable) throw new Error('Trading Account table must be loaded before use.');
    return this.accountTable;
  }
}

function tradingAccountToRow(account: TradingAccountRecord): unknown[] {
  return [account.id, account.name, account.baseCurrency, account.riskPercentPerTrade];
}

/**
 * Cloud Run writer for Signals History, the canonical provider archive. It writes the complete
 * configured provider snapshot schema and preserves existing deduplication keys.
 */
export class CloudRunSignalHistoryRepository implements SignalHistoryRepository {
  constructor(
    private readonly context: MutationContext,
    private readonly keys = new Set<string>()
  ) {}
  ensureReady(attributeNames: string[]): void {
    const unsupportedAttribute = attributeNames.find(
      (header) => !isSupportedMomentumBreakoutAttribute(header)
    );
    if (unsupportedAttribute) {
      throw new Error(`Signals History attribut non supporté : ${unsupportedAttribute}`);
    }
  }
  loadExistingKeys(): Set<string> {
    return new Set(this.keys);
  }
  append(snapshots: SignalSnapshot[]): void {
    if (snapshots.length === 0) return;
    this.context.writer.append(
      SHEET_DEFINITIONS.signalsHistory.range,
      snapshots.map(signalSnapshotToRow)
    );
  }
}

/**
 * Technical provider projection writer used for operator inspection of the latest Finviz import;
 * Discovery itself reads from Signals History, not this projection.
 */
export class CloudRunMarketSignalProjection implements MarketSignalProjection {
  constructor(private readonly context: MutationContext) {}
  replace(batch: MarketSignalBatch, refreshedAt: Date): void {
    this.context.writer.update("'Finviz Signals'!A1:Z", [
      ['Strategy ID', 'Strategy', 'Strategy Version', 'Refreshed At', ...batch.attributeNames],
      ...batch.signals.map((signal) => [
        batch.feed.strategyId,
        batch.feed.strategyName,
        batch.feed.strategyVersion,
        formatDateTime(refreshedAt),
        ...batch.attributeNames.map((name) => signal.attributes[name] ?? '')
      ])
    ]);
  }
}

/**
 * Request-loaded strategy catalog that resolves the single active version for a Strategy ID.
 */
export class LoadedTradingStrategyCatalog implements TradingStrategyCatalog {
  constructor(
    private readonly strategies: readonly TradingStrategy[],
    private readonly versions: readonly TradingStrategyVersion[]
  ) {}
  getById(strategyId: string) {
    const expected = textValue(strategyId).toUpperCase();
    const strategy = this.strategies.find((candidate) => candidate.id === expected);
    if (!strategy) throw new Error(`Stratégie inconnue : ${expected}`);
    const version = this.versions.find(
      (candidate) => candidate.strategyId === expected && candidate.enabled
    );
    if (!version) throw new Error(`Aucune version active pour ${expected}.`);
    return { id: strategy.id, version: version.version, enabled: strategy.enabled };
  }
}

/**
 * Preloads the tables commonly needed by multi-step mutations so each use case shares the same
 * request-scoped source data and deferred writer.
 */
export async function loadMutationRepositories(context: MutationContext) {
  await context.sheets.batchLoad([
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.tradePlans,
    SHEET_DEFINITIONS.positions,
    SHEET_DEFINITIONS.journal,
    SHEET_DEFINITIONS.accounts,
    SHEET_DEFINITIONS.strategies,
    SHEET_DEFINITIONS.strategyVersions
  ]);
  const accounts = await readTradingAccounts(context.sheets);
  const strategies = await readStrategyRecords(context.sheets);
  const strategyVersions = await readStrategyVersionsForMutations(context.sheets);
  const policies = await readRiskPolicies(context.sheets);
  return {
    watchlistRepository: await new CloudRunWatchlistRepository(context).load(),
    tradePlanRepository: await new CloudRunTradePlanRepository(context).load(),
    positionRepository: await new CloudRunPositionRepository(context).load(),
    journalRepository: await new CloudRunJournalRepository(context).load(),
    capitalTransactionRepository: await new CloudRunCapitalTransactionRepository(context).load(),
    tradingAccountRepository: new LoadedTradingAccountRepository(accounts),
    tradingAccountRiskPolicyRepository: new LoadedTradingAccountRiskPolicyRepository(policies),
    strategyRepository: new LoadedStrategyRepository(strategies, strategyVersions)
  };
}

async function readRiskPolicies(context: RequestScopedSheets): Promise<TradingAccountRiskPolicy[]> {
  const table = await context.getTable(SHEET_DEFINITIONS.accounts);
  return table.table.rows
    .filter((row) => row.some((value) => textValue(value)))
    .map((row) => ({
      accountId: textValue(valueByHeader(table.table.headers, row, 'Account ID')).toUpperCase(),
      riskPercentPerTrade: Number(valueByHeader(table.table.headers, row, 'Risk % Per Trade'))
    }));
}

async function readStrategyVersionsForMutations(
  context: RequestScopedSheets
): Promise<TradingStrategyVersion[]> {
  return readStrategyVersionRecords(context);
}

function watchlistEntryToRow(entry: WatchlistEntry, rowNumber: number): unknown[] {
  return [
    entry.id,
    entry.strategyId,
    entry.strategyName,
    entry.strategyVersion,
    entry.signalDate,
    entry.ticker,
    entry.company,
    entry.sector,
    entry.addedAt,
    entry.signalPrice,
    `=IFERROR(GOOGLEFINANCE(F${rowNumber},"price"),"")`,
    `=IF(OR(J${rowNumber}="",K${rowNumber}=""),"",K${rowNumber}/J${rowNumber}-1)`,
    entry.momentumScore,
    entry.status,
    entry.setupStatus,
    entry.breakoutLevel,
    `=IF(OR(K${rowNumber}="",P${rowNumber}=""),"",K${rowNumber}/P${rowNumber}-1)`,
    entry.invalidationLevel,
    entry.earningsDate,
    entry.eventRisk,
    entry.notes,
    entry.closedAt
  ];
}

function tradePlanToRow(tradePlan: TradePlan, rowNumber: number): unknown[] {
  return [
    tradePlan.id,
    tradePlan.watchlistId,
    tradePlan.strategyId,
    tradePlan.strategyName,
    tradePlan.strategyVersion,
    tradePlan.signalDate,
    tradePlan.signalPrice,
    tradePlan.ticker,
    tradePlan.referencePrice,
    tradePlan.momentumScore,
    tradePlan.setupStatus,
    tradePlan.breakoutLevel,
    tradePlan.invalidationLevel,
    tradePlan.eventRisk,
    tradePlan.createdAt,
    tradePlan.entryType,
    tradePlan.entryPrice,
    tradePlan.stopPrice,
    tradePlan.targetPrice,
    `=IF(OR(Q${rowNumber}="",R${rowNumber}=""),"",Q${rowNumber}-R${rowNumber})`,
    `=IF(OR(Q${rowNumber}="",S${rowNumber}=""),"",S${rowNumber}-Q${rowNumber})`,
    `=IF(OR(T${rowNumber}="",T${rowNumber}<=0,U${rowNumber}=""),"",U${rowNumber}/T${rowNumber})`,
    tradePlan.accountEquity,
    tradePlan.riskPercent,
    `=IF(OR(W${rowNumber}="",X${rowNumber}=""),"",W${rowNumber}*X${rowNumber})`,
    `=IF(OR(Y${rowNumber}="",T${rowNumber}="",T${rowNumber}<=0),"",FLOOR(Y${rowNumber}/T${rowNumber},1))`,
    `=IF(OR(Z${rowNumber}="",Q${rowNumber}=""),"",Z${rowNumber}*Q${rowNumber})`,
    tradePlan.status,
    tradePlan.notes,
    tradePlan.accountId
  ];
}

function tradePlanPlanningCells(
  tradePlan: TradePlan,
  rowNumber: number,
  positionSizeOverridden: boolean
): unknown[] {
  return [
    tradePlan.entryPrice,
    tradePlan.stopPrice,
    tradePlan.targetPrice,
    `=IF(OR(Q${rowNumber}="",R${rowNumber}=""),"",Q${rowNumber}-R${rowNumber})`,
    `=IF(OR(Q${rowNumber}="",S${rowNumber}=""),"",S${rowNumber}-Q${rowNumber})`,
    `=IF(OR(T${rowNumber}="",T${rowNumber}<=0,U${rowNumber}=""),"",U${rowNumber}/T${rowNumber})`,
    tradePlan.accountEquity,
    tradePlan.riskPercent,
    `=IF(OR(W${rowNumber}="",X${rowNumber}=""),"",W${rowNumber}*X${rowNumber})`,
    positionSizeOverridden
      ? tradePlan.positionSize
      : `=IF(OR(Y${rowNumber}="",T${rowNumber}="",T${rowNumber}<=0),"",FLOOR(Y${rowNumber}/T${rowNumber},1))`,
    positionSizeOverridden
      ? tradePlan.positionValue
      : `=IF(OR(Z${rowNumber}="",Q${rowNumber}=""),"",Z${rowNumber}*Q${rowNumber})`
  ];
}

function positionToRow(position: Position, rowNumber: number): unknown[] {
  return [
    position.id,
    position.tradePlanId,
    position.watchlistId,
    position.strategyId,
    position.strategyName,
    position.strategyVersion,
    position.ticker,
    position.openedAt,
    position.plannedEntry,
    position.actualEntry,
    position.plannedQuantity,
    position.actualQuantity,
    position.initialStop,
    position.currentStop,
    position.target,
    position.plannedMaxRisk,
    position.plannedRiskReward,
    `=IFERROR(GOOGLEFINANCE(G${rowNumber},"price"),"")`,
    `=IF(OR(R${rowNumber}="",J${rowNumber}="",L${rowNumber}=""),"",(R${rowNumber}-J${rowNumber})*L${rowNumber})`,
    `=IF(OR(R${rowNumber}="",J${rowNumber}=""),"",R${rowNumber}/J${rowNumber}-1)`,
    position.status,
    position.closedAt,
    position.exitPrice,
    position.realizedPnl,
    position.notes,
    position.accountId
  ];
}

function journalEntryToRow(entry: JournalEntry, rowNumber: number): unknown[] {
  return [
    entry.id,
    entry.positionId,
    entry.tradePlanId,
    entry.watchlistId,
    entry.strategyId,
    entry.strategyName,
    entry.strategyVersion,
    entry.ticker,
    entry.openedAt,
    entry.closedAt,
    entry.plannedEntry,
    entry.actualEntry,
    entry.exitPrice,
    entry.quantity,
    entry.initialStop,
    entry.target,
    entry.plannedMaxRisk,
    entry.plannedRiskReward,
    entry.realizedPnl,
    `=IF(OR(L${rowNumber}="",M${rowNumber}=""),"",M${rowNumber}/L${rowNumber}-1)`,
    `=IF(OR(Q${rowNumber}="",Q${rowNumber}<=0,S${rowNumber}=""),"",S${rowNumber}/Q${rowNumber})`,
    `=IF(S${rowNumber}="","",IF(S${rowNumber}>0,"WIN",IF(S${rowNumber}<0,"LOSS","BREAKEVEN")))`,
    entry.exitReason,
    entry.executionNotes,
    entry.lessonsLearned,
    entry.followedPlan,
    entry.accountId
  ];
}

function capitalTransactionToRow(transaction: CapitalTransaction): unknown[] {
  return [
    transaction.id,
    transaction.accountId,
    transaction.type,
    transaction.amount,
    transaction.occurredAt,
    transaction.note
  ];
}

function signalSnapshotToRow(snapshot: SignalSnapshot): unknown[] {
  return [
    snapshot.signalDate,
    snapshot.detectedAt,
    snapshot.strategyId,
    snapshot.strategyName,
    snapshot.strategyVersion,
    snapshot.ticker,
    ...MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS.map((header) =>
      signalAttributeValue(snapshot, header)
    )
  ];
}

function isSupportedMomentumBreakoutAttribute(header: string): boolean {
  return (FINVIZ_MOMENTUM_EXPORT_HEADERS as readonly string[]).includes(header);
}

function signalAttributeValue(snapshot: SignalSnapshot, header: string): unknown {
  const providerHeader = FINVIZ_MOMENTUM_EXPORT_HEADERS.find(
    (candidate) => signalsHistoryHeaderForFinvizHeader(candidate) === header
  );
  return providerHeader ? (snapshot.attributes[providerHeader] ?? '') : '';
}

function serializeRows(rows: unknown[][]): unknown[][] {
  return rows.map((row) =>
    row.map((value) => {
      if (value instanceof Date) return formatDateTime(value);
      if (value === null || value === undefined) return '';
      return value;
    })
  );
}

function formatDateTime(date: Date): string {
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

function columnName(index: number): string {
  let column = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }
  return column;
}

function cellRange(sheetName: string, row: number, column: number): string {
  const columnLabel = columnName(column);
  return `'${sheetName}'!${columnLabel}${row}`;
}

function rowRange(sheetName: string, row: number, startColumn: number, endColumn: number): string {
  return `'${sheetName}'!${columnName(startColumn)}${row}:${columnName(endColumn)}${row}`;
}

function requireWrite<T>(operation: T | undefined, name: string): asserts operation is T {
  if (!operation) throw new Error(`Google Sheets API client does not support ${name}.`);
}
