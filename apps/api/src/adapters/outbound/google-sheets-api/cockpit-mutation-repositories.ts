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
import type { TradingAccount } from '@trading-cockpit/core/domain/trading-account';
import type { TradingAccountRiskPolicy } from '@trading-cockpit/core/domain/trading-account-risk-policy';
import type { RuntimePort } from '@trading-cockpit/core/ports/outbound/runtime-port';
import type { StrategyRepository } from '@trading-cockpit/core/ports/outbound/strategy-repository';
import type { WatchlistRepository } from '@trading-cockpit/core/ports/outbound/watchlist-repository';
import type { TradePlanRepository } from '@trading-cockpit/core/ports/outbound/trade-plan-repository';
import type { PositionRepository } from '@trading-cockpit/core/ports/outbound/position-repository';
import type { JournalRepository } from '@trading-cockpit/core/ports/outbound/journal-repository';
import type { CapitalTransactionRepository } from '@trading-cockpit/core/ports/outbound/capital-transaction-repository';
import type { TradingAccountRepository } from '@trading-cockpit/core/ports/outbound/trading-account-repository';
import type { TradingAccountRiskPolicyRepository } from '@trading-cockpit/core/ports/outbound/trading-account-risk-policy-repository';
import type { MomentumRankingProjection } from '@trading-cockpit/core/ports/outbound/momentum-ranking-projection';
import type {
  MomentumSignalRepository,
  MomentumStrategyRepository
} from '@trading-cockpit/core/ports/outbound/momentum-signal-repository';
import type { SignalHistoryRepository } from '@trading-cockpit/core/ports/outbound/signal-history-repository';
import type { MarketSignalProjection } from '@trading-cockpit/core/ports/outbound/market-signal-projection';
import type { TradingStrategyCatalog } from '@trading-cockpit/core/ports/outbound/trading-strategy-catalog';
import type { MarketSignalBatch, SignalSnapshot } from '@trading-cockpit/core/domain/market-signal';
import type {
  RankedMomentumCandidate,
  MomentumCandidate
} from '@trading-cockpit/core/domain/momentum';
import type { SheetsValuesClient } from './google-sheets-api-client';
import {
  readJournalEntries,
  readPositions,
  readTradingAccounts,
  readTradePlans,
  readWatchlistEntries,
  SHEET_DEFINITIONS
} from './cockpit-query-readers';
import {
  requireColumn,
  textValue,
  valueByHeader,
  type RequestScopedSheets
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

export class NodeRuntime implements RuntimePort {
  constructor(private readonly clock: () => Date) {}
  now(): Date {
    return this.clock();
  }
  newId(): string {
    return randomUUID();
  }
}

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
  constructor(private readonly ids: readonly string[]) {}
  existsById(strategyId: string): boolean {
    return this.ids.includes(textValue(strategyId).toUpperCase());
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

export class CloudRunMomentumRankingProjection implements MomentumRankingProjection {
  constructor(private readonly context: MutationContext) {}
  replace(
    ranked: RankedMomentumCandidate[],
    signalDate: string,
    strategy: { id: string; name: string; version: string }
  ): void {
    const rows = ranked.map((candidate, index) => [
      index + 1,
      strategy.id,
      strategy.name,
      strategy.version,
      signalDate,
      candidate.ticker,
      candidate.company,
      candidate.sector,
      candidate.price,
      candidate.high52,
      candidate.high52Score,
      candidate.relativeVolume,
      candidate.relativeVolumeScore,
      candidate.performanceMonth,
      candidate.performanceScore,
      candidate.rsi,
      candidate.rsiScore,
      candidate.sma20,
      candidate.sma20Score,
      candidate.total,
      'REVIEW'
    ]);
    this.context.writer.update("'Momentum Ranking'!A1:U", [
      [...SHEET_DEFINITIONS.momentumRanking.requiredHeaders],
      ...rows
    ]);
  }
}

export class CloudRunMomentumSignalRepository
  implements MomentumSignalRepository, MomentumStrategyRepository
{
  private candidates: MomentumCandidate[] | null = null;
  private strategies: Array<{
    id: string;
    name: string;
    version: string;
    enabled: boolean;
  }> | null = null;

  constructor(private readonly context: MutationContext) {}

  async load(): Promise<this> {
    await this.context.sheets.batchLoad([
      SHEET_DEFINITIONS.signalsHistory,
      SHEET_DEFINITIONS.strategies
    ]);
    this.strategies = await readStrategiesForMomentum(this.context.sheets);
    this.candidates = await readMomentumCandidates(this.context.sheets);
    return this;
  }

  findByStrategy(strategyId: string, strategyVersion: string): MomentumCandidate[] {
    const expectedId = textValue(strategyId).toUpperCase();
    const expectedVersion = textValue(strategyVersion);
    return this.loadedCandidates().filter(
      (candidate) =>
        candidate.strategyId.toUpperCase() === expectedId &&
        candidate.strategyVersion === expectedVersion
    );
  }
  getById(strategyId: string) {
    const id = textValue(strategyId).toUpperCase();
    const strategy = this.loadedStrategies().find((candidate) => candidate.id === id);
    if (!strategy) throw new Error(`Stratégie inconnue : ${id}`);
    return strategy;
  }

  private loadedCandidates(): MomentumCandidate[] {
    if (!this.candidates) throw new Error('Momentum signals must be loaded before use.');
    return this.candidates;
  }

  private loadedStrategies() {
    if (!this.strategies) throw new Error('Momentum strategies must be loaded before use.');
    return this.strategies;
  }
}

export class CloudRunSignalHistoryRepository implements SignalHistoryRepository {
  constructor(
    private readonly context: MutationContext,
    private readonly keys = new Set<string>()
  ) {}
  ensureReady(): void {
    // Schema setup is handled by dedicated setup endpoints; refresh validates via append/read.
  }
  loadExistingKeys(): Set<string> {
    return new Set(this.keys);
  }
  append(snapshots: SignalSnapshot[]): void {
    if (snapshots.length === 0) return;
    this.context.writer.append("'Signals History'!A:Z", snapshots.map(signalSnapshotToRow));
  }
}

export class CloudRunMarketSignalProjection implements MarketSignalProjection {
  constructor(private readonly context: MutationContext) {}
  replace(batch: MarketSignalBatch, refreshedAt: Date): void {
    this.context.writer.update("'Finviz - Momentum'!A1:Z", [
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

export class LoadedTradingStrategyCatalog implements TradingStrategyCatalog {
  constructor(
    private readonly strategies: Array<{ id: string; version: string; enabled: boolean }>
  ) {}
  getById(strategyId: string) {
    const expected = textValue(strategyId).toUpperCase();
    const strategy = this.strategies.find((candidate) => candidate.id === expected);
    if (!strategy) throw new Error(`Stratégie inconnue : ${expected}`);
    return strategy;
  }
}

async function readMomentumCandidates(sheets: RequestScopedSheets): Promise<MomentumCandidate[]> {
  const table = (await sheets.getTable(SHEET_DEFINITIONS.signalsHistory)).table;
  const tickerIndex = requireColumn(table.headers, 'Ticker');
  const companyIndex = requireColumnAfter(table.headers, 'Company', tickerIndex);
  const sectorIndex = requireColumnAfter(table.headers, 'Sector', tickerIndex);
  const priceIndex = requireColumnAfter(table.headers, 'Price', tickerIndex);
  const high52Index = requireColumnAfter(table.headers, '52-Week High', tickerIndex);
  const relativeVolumeIndex = requireColumnAfter(table.headers, 'Relative Volume', tickerIndex);
  const performanceMonthIndex = requireColumnAfter(
    table.headers,
    'Performance (Month)',
    tickerIndex
  );
  const rsiIndex = requireColumnAfter(table.headers, 'Relative Strength Index (14)', tickerIndex);
  const sma20Index = requireColumnAfter(table.headers, '20-Day Simple Moving Average', tickerIndex);
  return table.rows.map((row) => ({
    strategyId: textValue(valueByHeader(table.headers, row, 'Strategy ID')).toUpperCase(),
    strategy: textValue(valueByHeader(table.headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(table.headers, row, 'Strategy Version')),
    signalDate: normalizeSignalDate(valueByHeader(table.headers, row, 'Signal Date')),
    ticker: textValue(row[tickerIndex]).toUpperCase(),
    company: row[companyIndex] || '',
    sector: row[sectorIndex] || '',
    price: parseNumber(row[priceIndex]),
    high52: parsePercent(row[high52Index]),
    relativeVolume: parseNumber(row[relativeVolumeIndex]),
    performanceMonth: parsePercent(row[performanceMonthIndex]),
    rsi: parseNumber(row[rsiIndex]),
    sma20: parsePercent(row[sma20Index])
  }));
}

async function readStrategiesForMomentum(sheets: RequestScopedSheets) {
  const table = (await sheets.getTable(SHEET_DEFINITIONS.strategies)).table;
  return table.rows
    .filter((row) => row.some((value) => textValue(value)))
    .map((row) => ({
      id: textValue(valueByHeader(table.headers, row, 'Strategy ID')).toUpperCase(),
      name: textValue(valueByHeader(table.headers, row, 'Name')),
      version: textValue(valueByHeader(table.headers, row, 'Version')),
      enabled:
        valueByHeader(table.headers, row, 'Enabled') === true ||
        textValue(valueByHeader(table.headers, row, 'Enabled')).toUpperCase() === 'TRUE'
    }));
}

function requireColumnAfter(headers: string[], name: string, afterIndex: number): number {
  const expected = name.trim().toLowerCase();
  for (let index = afterIndex + 1; index < headers.length; index += 1) {
    if (headers[index].trim().toLowerCase() === expected) return index;
  }
  throw new Error(`Colonne Finviz absente : ${name}`);
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  const parsed = Number(text.replace('%', '').replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return text.endsWith('%') ? parsed / 100 : parsed;
}

function normalizeSignalDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  return String(value).trim().substring(0, 10);
}

export async function loadMutationRepositories(context: MutationContext) {
  await context.sheets.batchLoad([
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.tradePlans,
    SHEET_DEFINITIONS.positions,
    SHEET_DEFINITIONS.journal,
    SHEET_DEFINITIONS.accounts,
    SHEET_DEFINITIONS.strategies
  ]);
  const accounts = await readTradingAccounts(context.sheets);
  const strategies = await readStrategyIdsForMutations(context.sheets);
  const policies = await readRiskPolicies(context.sheets);
  return {
    watchlistRepository: await new CloudRunWatchlistRepository(context).load(),
    tradePlanRepository: await new CloudRunTradePlanRepository(context).load(),
    positionRepository: await new CloudRunPositionRepository(context).load(),
    journalRepository: await new CloudRunJournalRepository(context).load(),
    capitalTransactionRepository: await new CloudRunCapitalTransactionRepository(context).load(),
    tradingAccountRepository: new LoadedTradingAccountRepository(accounts),
    tradingAccountRiskPolicyRepository: new LoadedTradingAccountRiskPolicyRepository(policies),
    strategyRepository: new LoadedStrategyRepository(strategies)
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

async function readStrategyIdsForMutations(context: RequestScopedSheets): Promise<string[]> {
  const table = await context.getTable(SHEET_DEFINITIONS.strategies);
  return table.table.rows
    .map((row) => textValue(valueByHeader(table.table.headers, row, 'Strategy ID')).toUpperCase())
    .filter(Boolean);
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
    ...Object.values(snapshot.attributes)
  ];
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
