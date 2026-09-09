import type { JournalEntry, JournalMetric } from '@trading-cockpit/core/domain/journal-entry';
import type { SignalSnapshot } from '@trading-cockpit/core/domain/market-signal';
import {
  createCapitalTransaction,
  type CapitalTransaction
} from '@trading-cockpit/core/domain/capital-transaction';
import type { Position } from '@trading-cockpit/core/domain/position';
import type { TradePlan } from '@trading-cockpit/core/domain/trade-plan';
import type {
  TradingAccount,
  TradingAccountRecord
} from '@trading-cockpit/core/domain/trading-account';
import {
  normalizeTradingAccountRecord,
  requireUniqueTradingAccountIds
} from '@trading-cockpit/core/domain/trading-account';
import type { WatchlistEntry } from '@trading-cockpit/core/domain/watchlist';
import {
  normalizeTradingStrategy,
  normalizeTradingStrategyVersion,
  type TradingStrategy,
  type TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';
import type { DashboardRepositorySnapshot } from '@trading-cockpit/core/ports/outbound/dashboard-repository';
import type { DiscoverySignalReader } from '@trading-cockpit/core/ports/outbound/discovery-signal-reader';
import type { JournalReader } from '@trading-cockpit/core/ports/outbound/journal-reader';
import type { PositionReader } from '@trading-cockpit/core/ports/outbound/position-reader';
import type { TradePlanReader } from '@trading-cockpit/core/ports/outbound/trade-plan-reader';
import type { TradingAccountRepository } from '@trading-cockpit/core/ports/outbound/trading-account-repository';
import type { WatchlistReader } from '@trading-cockpit/core/ports/outbound/watchlist-reader';
import {
  SIGNALS_HISTORY_HEADERS,
  STRATEGY_HEADERS,
  STRATEGY_VERSION_HEADERS
} from '@trading-cockpit/contracts';
import {
  nullableText,
  numberOrNull,
  snapshotValue,
  textValue,
  type RequestScopedSheets,
  type SheetTable,
  type SheetTableDefinition,
  valueByHeader
} from './sheets-api-table';

export const WATCHLIST_HEADERS = [
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Signal Date',
  'Ticker',
  'Company',
  'Sector',
  'Added At',
  'Signal Price',
  'Current Price',
  'Change Since Signal',
  'Status',
  'Setup Status',
  'Trigger Level',
  'Distance to Trigger',
  'Invalidation Level',
  'Earnings Date',
  'Event Risk',
  'Notes',
  'Closed At'
] as const;

const TRADE_PLAN_HEADERS = [
  'Trade Plan ID',
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Signal Date',
  'Signal Price',
  'Ticker',
  'Reference Price',
  'Setup Status',
  'Trigger Level',
  'Invalidation Level',
  'Event Risk',
  'Created At',
  'Entry Type',
  'Entry Price',
  'Stop Price',
  'Target Price',
  'Risk / Share',
  'Reward / Share',
  'Risk : Reward',
  'Account Equity',
  'Risk %',
  'Max Risk $',
  'Position Size',
  'Position Value',
  'Status',
  'Notes',
  'Account ID'
] as const;

const POSITION_HEADERS = [
  'Position ID',
  'Trade Plan ID',
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Ticker',
  'Opened At',
  'Planned Entry',
  'Actual Entry',
  'Planned Quantity',
  'Actual Quantity',
  'Initial Stop',
  'Current Stop',
  'Target',
  'Planned Max Risk',
  'Planned R:R',
  'Current Price',
  'Unrealized P&L',
  'Unrealized P&L %',
  'Status',
  'Closed At',
  'Exit Price',
  'Realized P&L',
  'Notes',
  'Account ID'
] as const;

const JOURNAL_HEADERS = [
  'Journal ID',
  'Position ID',
  'Trade Plan ID',
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Ticker',
  'Opened At',
  'Closed At',
  'Planned Entry',
  'Actual Entry',
  'Exit Price',
  'Quantity',
  'Initial Stop',
  'Target',
  'Planned Max Risk',
  'Planned R:R',
  'Realized P&L',
  'Return %',
  'R-Multiple',
  'Outcome',
  'Exit Reason',
  'Execution Notes',
  'Lessons Learned',
  'Followed Plan?',
  'Account ID'
] as const;

const CAPITAL_LEDGER_HEADERS = [
  'Transaction ID',
  'Account ID',
  'Type',
  'Amount',
  'Occurred At',
  'Note'
] as const;

export const SHEET_DEFINITIONS = {
  watchlist: {
    key: 'watchlist',
    sheetName: 'Watchlist',
    range: "'Watchlist'!A:U",
    requiredHeaders: WATCHLIST_HEADERS,
    dateHeaders: ['Signal Date', 'Added At', 'Earnings Date', 'Closed At']
  },
  tradePlans: {
    key: 'tradePlans',
    sheetName: 'Trade Plans',
    range: "'Trade Plans'!A:AC",
    requiredHeaders: TRADE_PLAN_HEADERS,
    dateHeaders: ['Signal Date', 'Created At']
  },
  positions: {
    key: 'positions',
    sheetName: 'Positions',
    range: "'Positions'!A:Z",
    requiredHeaders: POSITION_HEADERS,
    dateHeaders: ['Opened At', 'Closed At']
  },
  journal: {
    key: 'journal',
    sheetName: 'Journal',
    range: "'Journal'!A:AA",
    requiredHeaders: JOURNAL_HEADERS,
    dateHeaders: ['Opened At', 'Closed At']
  },
  accounts: {
    key: 'accounts',
    sheetName: 'Accounts',
    range: "'Accounts'!A:D",
    requiredHeaders: ['Account ID', 'Name', 'Base Currency', 'Risk % Per Trade']
  },
  capitalLedger: {
    key: 'capitalLedger',
    sheetName: 'Capital Ledger',
    range: "'Capital Ledger'!A:F",
    requiredHeaders: CAPITAL_LEDGER_HEADERS,
    dateHeaders: ['Occurred At']
  },
  strategies: {
    key: 'strategies',
    sheetName: 'Strategies',
    range: "'Strategies'!A:E",
    requiredHeaders: STRATEGY_HEADERS
  },
  strategyVersions: {
    key: 'strategyVersions',
    sheetName: 'Strategy Versions',
    range: "'Strategy Versions'!A:F",
    requiredHeaders: STRATEGY_VERSION_HEADERS
  },
  signalsHistory: {
    key: 'signalsHistory',
    sheetName: 'Signals History',
    range: "'Signals History'!A:AA",
    requiredHeaders: SIGNALS_HISTORY_HEADERS,
    dateHeaders: ['Signal Date', 'Detected At', 'Earnings Date']
  }
} as const satisfies Record<string, SheetTableDefinition>;

export class LoadedWatchlistReader implements WatchlistReader {
  constructor(private readonly entries: readonly WatchlistEntry[]) {}
  findAll(): WatchlistEntry[] {
    return [...this.entries];
  }
}

export class LoadedTradePlanReader implements TradePlanReader {
  constructor(private readonly plans: readonly TradePlan[]) {}
  findAll(): TradePlan[] {
    return [...this.plans];
  }
}

export class LoadedPositionReader implements PositionReader {
  constructor(private readonly positions: readonly Position[]) {}
  findAll(): Position[] {
    return [...this.positions];
  }
}

export class LoadedJournalReader implements JournalReader {
  constructor(private readonly entries: readonly JournalEntry[]) {}
  findAll(): JournalEntry[] {
    return [...this.entries];
  }
}

/**
 * Request-local Discovery reader assembled from already-loaded Sheets API tables. It lets core
 * use cases read signals and strategy configuration without knowing the HTTP/Sheets transport.
 */
export class LoadedDiscoverySignalReader implements DiscoverySignalReader {
  constructor(
    private readonly signals: readonly SignalSnapshot[],
    private readonly strategies: readonly TradingStrategy[],
    private readonly versions: readonly TradingStrategyVersion[]
  ) {}

  findAllSignals(): SignalSnapshot[] {
    return [...this.signals];
  }

  findAllStrategies(): TradingStrategy[] {
    return [...this.strategies];
  }

  findAllStrategyVersions(): TradingStrategyVersion[] {
    return [...this.versions];
  }
}

/**
 * Request-local account repository used by account-scoped queries after the Accounts table has
 * been loaded once.
 */
export class LoadedTradingAccountRepository implements TradingAccountRepository {
  constructor(private readonly accounts: readonly TradingAccount[]) {}
  findAll(): TradingAccount[] {
    return [...this.accounts];
  }
  findById(accountId: string): TradingAccount | null {
    const expected = textValue(accountId).toUpperCase();
    return this.accounts.find((account) => account.id === expected) ?? null;
  }
}

export async function readWatchlistEntries(sheets: RequestScopedSheets): Promise<WatchlistEntry[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.watchlist);
  return table.rows
    .map((row) => watchlistEntryFromRow(table.headers, row))
    .filter((entry) => entry.id);
}

export async function readTradePlans(sheets: RequestScopedSheets): Promise<TradePlan[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.tradePlans);
  return table.rows.map((row) => tradePlanFromRow(table.headers, row)).filter((plan) => plan.id);
}

export async function readPositions(sheets: RequestScopedSheets): Promise<Position[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.positions);
  return table.rows
    .map((row) => positionFromRow(table.headers, row))
    .filter((position) => position.id);
}

export async function readJournalEntries(sheets: RequestScopedSheets): Promise<JournalEntry[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.journal);
  return table.rows
    .map((row) => journalEntryFromRow(table.headers, row))
    .filter((entry) => entry.id);
}

export async function readTradingAccounts(sheets: RequestScopedSheets): Promise<TradingAccount[]> {
  return (await readTradingAccountRecords(sheets)).map(({ id, name, baseCurrency }) => ({
    id,
    name,
    baseCurrency
  }));
}

/**
 * Reads canonical Account rows including Risk % Per Trade, then validates account identity
 * uniqueness before financial queries consume them.
 */
export async function readTradingAccountRecords(
  sheets: RequestScopedSheets
): Promise<TradingAccountRecord[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.accounts);
  const accounts = table.rows
    .filter((row) => row.some((value) => textValue(value)))
    .map((row) =>
      normalizeTradingAccountRecord({
        id: textValue(valueByHeader(table.headers, row, 'Account ID')),
        name: textValue(valueByHeader(table.headers, row, 'Name')),
        baseCurrency: textValue(valueByHeader(table.headers, row, 'Base Currency')),
        riskPercentPerTrade: Number(valueByHeader(table.headers, row, 'Risk % Per Trade'))
      })
    );
  requireUniqueTradingAccountIds(accounts);
  return accounts;
}

export async function readCapitalTransactions(
  sheets: RequestScopedSheets
): Promise<CapitalTransaction[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.capitalLedger);
  return table.rows
    .filter((row) => row.some((value) => textValue(value)))
    .map((row) =>
      createCapitalTransaction({
        id: textValue(valueByHeader(table.headers, row, 'Transaction ID')),
        accountId: textValue(valueByHeader(table.headers, row, 'Account ID')),
        type: textValue(valueByHeader(table.headers, row, 'Type')) as CapitalTransaction['type'],
        amount: Number(valueByHeader(table.headers, row, 'Amount')),
        occurredAt: dateValue(valueByHeader(table.headers, row, 'Occurred At')),
        note: textValue(valueByHeader(table.headers, row, 'Note'))
      })
    );
}

export async function readStrategyIds(sheets: RequestScopedSheets): Promise<string[]> {
  const strategies = await readStrategyRecords(sheets);
  return strategies.map((strategy) => strategy.id);
}

/**
 * Validates the two-sheet Strategy model: stable parent strategies, immutable version identities
 * and at most one active version per enabled Strategy ID.
 */
export async function validateStrategies(sheets: RequestScopedSheets): Promise<true> {
  await sheets.batchLoad([SHEET_DEFINITIONS.strategies, SHEET_DEFINITIONS.strategyVersions]);
  const strategies = await readStrategyRecords(sheets);
  const versions = await readStrategyVersionRecords(sheets);
  const enabled = strategies.filter((strategy) => strategy.enabled);
  if (enabled.length === 0) throw new Error('Au moins une stratégie doit être active.');
  const ids = new Set<string>();
  for (const strategy of strategies) {
    if (!strategy.id) throw new Error('Strategy ID obligatoire.');
    if (ids.has(strategy.id)) throw new Error(`Strategy ID dupliqué : ${strategy.id}`);
    ids.add(strategy.id);
  }
  const versionKeys = new Set<string>();
  const activeVersionByEnabledStrategy = new Set<string>();
  for (const version of versions) {
    if (!ids.has(version.strategyId)) throw new Error(`Strategy inconnue : ${version.strategyId}`);
    const key = `${version.strategyId}|${version.version}`;
    if (versionKeys.has(key)) throw new Error(`Strategy Version dupliquée : ${key}`);
    versionKeys.add(key);
    if (!version.enabled) continue;
    const parent = strategies.find((strategy) => strategy.id === version.strategyId);
    if (!parent?.enabled) continue;
    if (activeVersionByEnabledStrategy.has(version.strategyId)) {
      throw new Error(`Plusieurs versions actives pour ${version.strategyId}`);
    }
    activeVersionByEnabledStrategy.add(version.strategyId);
  }
  return true;
}

/**
 * Reads Signals History as the canonical provider archive. Provider attributes remain attached to
 * snapshots, while downstream use cases choose the subset they need.
 */
export async function readSignalSnapshots(sheets: RequestScopedSheets): Promise<SignalSnapshot[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.signalsHistory);
  return table.rows
    .filter((row) => row.some((value) => textValue(value)))
    .map((row) => signalSnapshotFromRow(table.headers, row))
    .filter(
      (snapshot) =>
        snapshot.signalDate && snapshot.strategyId && snapshot.strategyVersion && snapshot.ticker
    );
}

/**
 * Loads the operational tables needed by Dashboard in one request-scoped batch so pipeline,
 * previews and action cards reuse the same source data.
 */
export async function readDashboardSnapshot(
  sheets: RequestScopedSheets
): Promise<DashboardRepositorySnapshot> {
  await sheets.batchLoad([
    SHEET_DEFINITIONS.signalsHistory,
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.tradePlans,
    SHEET_DEFINITIONS.positions
  ]);
  const signalsHistory = await readTable(sheets, SHEET_DEFINITIONS.signalsHistory);
  const watchlist = await readTable(sheets, SHEET_DEFINITIONS.watchlist);
  const tradePlans = await readTable(sheets, SHEET_DEFINITIONS.tradePlans);
  const positions = await readTable(sheets, SHEET_DEFINITIONS.positions);
  const signalSnapshots = signalsHistory.rows
    .filter((row) => row.some((value) => textValue(value)))
    .map((row) => signalSnapshotFromRow(signalsHistory.headers, row))
    .filter((signal) => signal.ticker);
  return {
    discoveryCandidates: latestSignals(signalSnapshots).map((signal, index) => ({
      rank: index + 1,
      ticker: signal.ticker,
      price: numberOrNull(signal.attributes.Price),
      high52: numberOrNull(signal.attributes['52-Week High']),
      relativeVolume: numberOrNull(signal.attributes['Relative Volume']),
      rsi: numberOrNull(signal.attributes['Relative Strength Index (14)']),
      reviewStatus: null
    })),
    watchlist: watchlist.rows
      .map((row) => ({
        ticker: textValue(valueByHeader(watchlist.headers, row, 'Ticker')).toUpperCase(),
        currentPrice: numberOrNull(valueByHeader(watchlist.headers, row, 'Current Price')),
        signalPrice: numberOrNull(valueByHeader(watchlist.headers, row, 'Signal Price')),
        changeSinceSignal: numberOrNull(
          valueByHeader(watchlist.headers, row, 'Change Since Signal')
        ),
        triggerLevel: numberOrNull(valueByHeader(watchlist.headers, row, 'Trigger Level')),
        distanceToTrigger: numberOrNull(
          valueByHeader(watchlist.headers, row, 'Distance to Trigger')
        ),
        setupStatus: nullableText(valueByHeader(watchlist.headers, row, 'Setup Status')),
        status: textValue(valueByHeader(watchlist.headers, row, 'Status')).toUpperCase()
      }))
      .filter((entry) => entry.ticker),
    tradePlans: tradePlans.rows.map((row) => ({
      accountId: textValue(valueByHeader(tradePlans.headers, row, 'Account ID')).toUpperCase(),
      status: textValue(valueByHeader(tradePlans.headers, row, 'Status')).toUpperCase()
    })),
    positions: positions.rows
      .map((row) => ({
        accountId: textValue(valueByHeader(positions.headers, row, 'Account ID')).toUpperCase(),
        ticker: textValue(valueByHeader(positions.headers, row, 'Ticker')).toUpperCase(),
        actualEntry: numberOrNull(valueByHeader(positions.headers, row, 'Actual Entry')),
        currentPrice: numberOrNull(valueByHeader(positions.headers, row, 'Current Price')),
        currentStop: numberOrNull(valueByHeader(positions.headers, row, 'Current Stop')),
        target: numberOrNull(valueByHeader(positions.headers, row, 'Target')),
        actualQuantity: numberOrNull(valueByHeader(positions.headers, row, 'Actual Quantity')),
        unrealizedPnl: numberOrNull(valueByHeader(positions.headers, row, 'Unrealized P&L')),
        unrealizedPnlPercent: numberOrNull(
          valueByHeader(positions.headers, row, 'Unrealized P&L %')
        ),
        status: textValue(valueByHeader(positions.headers, row, 'Status')).toUpperCase()
      }))
      .filter((position) => position.ticker)
  };
}

async function readTable(
  sheets: RequestScopedSheets,
  definition: SheetTableDefinition
): Promise<SheetTable> {
  return (await sheets.getTable(definition)).table;
}

function watchlistEntryFromRow(headers: string[], row: unknown[]): WatchlistEntry {
  return {
    id: textValue(valueByHeader(headers, row, 'Watchlist ID')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    signalDate: snapshotValue(valueByHeader(headers, row, 'Signal Date')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')),
    company: snapshotValue(valueByHeader(headers, row, 'Company')),
    sector: snapshotValue(valueByHeader(headers, row, 'Sector')),
    addedAt: snapshotValue(valueByHeader(headers, row, 'Added At')),
    signalPrice: snapshotValue(valueByHeader(headers, row, 'Signal Price')),
    currentPrice: snapshotValue(valueByHeader(headers, row, 'Current Price')),
    status: textValue(valueByHeader(headers, row, 'Status')),
    setupStatus: textValue(valueByHeader(headers, row, 'Setup Status')),
    triggerLevel: snapshotValue(valueByHeader(headers, row, 'Trigger Level')),
    invalidationLevel: snapshotValue(valueByHeader(headers, row, 'Invalidation Level')),
    earningsDate: snapshotValue(valueByHeader(headers, row, 'Earnings Date')),
    eventRisk: textValue(valueByHeader(headers, row, 'Event Risk')),
    notes: textValue(valueByHeader(headers, row, 'Notes')),
    closedAt: snapshotValue(valueByHeader(headers, row, 'Closed At'))
  };
}

function tradePlanFromRow(headers: string[], row: unknown[]): TradePlan {
  return {
    id: textValue(valueByHeader(headers, row, 'Trade Plan ID')),
    accountId: textValue(valueByHeader(headers, row, 'Account ID')).toUpperCase(),
    watchlistId: textValue(valueByHeader(headers, row, 'Watchlist ID')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    signalDate: snapshotValue(valueByHeader(headers, row, 'Signal Date')),
    signalPrice: snapshotValue(valueByHeader(headers, row, 'Signal Price')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')),
    referencePrice: snapshotValue(valueByHeader(headers, row, 'Reference Price')),
    setupStatus: textValue(valueByHeader(headers, row, 'Setup Status')),
    triggerLevel: snapshotValue(valueByHeader(headers, row, 'Trigger Level')),
    invalidationLevel: snapshotValue(valueByHeader(headers, row, 'Invalidation Level')),
    eventRisk: textValue(valueByHeader(headers, row, 'Event Risk')),
    createdAt: snapshotValue(valueByHeader(headers, row, 'Created At')),
    entryType: textValue(valueByHeader(headers, row, 'Entry Type')),
    entryPrice: snapshotValue(valueByHeader(headers, row, 'Entry Price')),
    stopPrice: snapshotValue(valueByHeader(headers, row, 'Stop Price')),
    targetPrice: snapshotValue(valueByHeader(headers, row, 'Target Price')),
    riskPerShare: snapshotValue(valueByHeader(headers, row, 'Risk / Share')),
    rewardPerShare: snapshotValue(valueByHeader(headers, row, 'Reward / Share')),
    riskReward: snapshotValue(valueByHeader(headers, row, 'Risk : Reward')),
    accountEquity: Number(valueByHeader(headers, row, 'Account Equity')),
    riskPercent: Number(valueByHeader(headers, row, 'Risk %')),
    maxRisk: snapshotValue(valueByHeader(headers, row, 'Max Risk $')),
    positionSize: snapshotValue(valueByHeader(headers, row, 'Position Size')),
    positionValue: snapshotValue(valueByHeader(headers, row, 'Position Value')),
    status: textValue(valueByHeader(headers, row, 'Status')),
    notes: textValue(valueByHeader(headers, row, 'Notes'))
  };
}

function positionFromRow(headers: string[], row: unknown[]): Position {
  return {
    id: textValue(valueByHeader(headers, row, 'Position ID')),
    accountId: textValue(valueByHeader(headers, row, 'Account ID')).toUpperCase(),
    tradePlanId: textValue(valueByHeader(headers, row, 'Trade Plan ID')),
    watchlistId: textValue(valueByHeader(headers, row, 'Watchlist ID')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')),
    openedAt: snapshotValue(valueByHeader(headers, row, 'Opened At')),
    plannedEntry: snapshotValue(valueByHeader(headers, row, 'Planned Entry')),
    actualEntry: snapshotValue(valueByHeader(headers, row, 'Actual Entry')),
    plannedQuantity: snapshotValue(valueByHeader(headers, row, 'Planned Quantity')),
    actualQuantity: snapshotValue(valueByHeader(headers, row, 'Actual Quantity')),
    initialStop: snapshotValue(valueByHeader(headers, row, 'Initial Stop')),
    currentStop: snapshotValue(valueByHeader(headers, row, 'Current Stop')),
    target: snapshotValue(valueByHeader(headers, row, 'Target')),
    plannedMaxRisk: snapshotValue(valueByHeader(headers, row, 'Planned Max Risk')),
    plannedRiskReward: snapshotValue(valueByHeader(headers, row, 'Planned R:R')),
    currentPrice: snapshotValue(valueByHeader(headers, row, 'Current Price')),
    unrealizedPnl: snapshotValue(valueByHeader(headers, row, 'Unrealized P&L')),
    unrealizedPnlPercent: snapshotValue(valueByHeader(headers, row, 'Unrealized P&L %')),
    status: textValue(valueByHeader(headers, row, 'Status')),
    closedAt: snapshotValue(valueByHeader(headers, row, 'Closed At')),
    exitPrice: snapshotValue(valueByHeader(headers, row, 'Exit Price')),
    realizedPnl: snapshotValue(valueByHeader(headers, row, 'Realized P&L')),
    notes: textValue(valueByHeader(headers, row, 'Notes'))
  };
}

function journalEntryFromRow(headers: string[], row: unknown[]): JournalEntry {
  const outcome = textValue(valueByHeader(headers, row, 'Outcome'));
  return {
    id: textValue(valueByHeader(headers, row, 'Journal ID')),
    positionId: textValue(valueByHeader(headers, row, 'Position ID')),
    accountId: textValue(valueByHeader(headers, row, 'Account ID')).toUpperCase(),
    tradePlanId: textValue(valueByHeader(headers, row, 'Trade Plan ID')),
    watchlistId: textValue(valueByHeader(headers, row, 'Watchlist ID')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')),
    openedAt: snapshotValue(valueByHeader(headers, row, 'Opened At')),
    closedAt: snapshotValue(valueByHeader(headers, row, 'Closed At')),
    plannedEntry: snapshotValue(valueByHeader(headers, row, 'Planned Entry')),
    actualEntry: snapshotValue(valueByHeader(headers, row, 'Actual Entry')),
    exitPrice: snapshotValue(valueByHeader(headers, row, 'Exit Price')),
    quantity: snapshotValue(valueByHeader(headers, row, 'Quantity')),
    initialStop: snapshotValue(valueByHeader(headers, row, 'Initial Stop')),
    target: snapshotValue(valueByHeader(headers, row, 'Target')),
    plannedMaxRisk: snapshotValue(valueByHeader(headers, row, 'Planned Max Risk')),
    plannedRiskReward: snapshotValue(valueByHeader(headers, row, 'Planned R:R')),
    realizedPnl: snapshotValue(valueByHeader(headers, row, 'Realized P&L')),
    returnPercent: metricValue(valueByHeader(headers, row, 'Return %')),
    rMultiple: metricValue(valueByHeader(headers, row, 'R-Multiple')),
    outcome: outcome === 'WIN' || outcome === 'LOSS' || outcome === 'BREAKEVEN' ? outcome : null,
    exitReason: textValue(valueByHeader(headers, row, 'Exit Reason')),
    executionNotes: textValue(valueByHeader(headers, row, 'Execution Notes')),
    lessonsLearned: textValue(valueByHeader(headers, row, 'Lessons Learned')),
    followedPlan: textValue(valueByHeader(headers, row, 'Followed Plan?'))
  };
}

function signalSnapshotFromRow(headers: string[], row: unknown[]): SignalSnapshot {
  const baseHeaders = new Set([
    'Signal Date',
    'Detected At',
    'Strategy ID',
    'Strategy',
    'Strategy Version',
    'Ticker'
  ]);
  const attributes: Record<string, unknown> = {};
  for (const header of headers) {
    if (!header || baseHeaders.has(header)) continue;
    attributes[header === 'Finviz Ticker' ? 'Ticker' : header] = valueByHeader(
      headers,
      row,
      header
    );
  }
  return {
    signalDate: normalizeSignalDate(valueByHeader(headers, row, 'Signal Date')),
    detectedAt: dateValue(valueByHeader(headers, row, 'Detected At')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')).toUpperCase(),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')).toUpperCase(),
    attributes
  };
}

function latestSignals(signals: readonly SignalSnapshot[]): SignalSnapshot[] {
  const latestDateByStrategy = new Map<string, string>();
  for (const signal of signals) {
    const key = `${signal.strategyId}|${signal.strategyVersion}`;
    const latest = latestDateByStrategy.get(key);
    if (!latest || signal.signalDate > latest) latestDateByStrategy.set(key, signal.signalDate);
  }
  return signals.filter(
    (signal) =>
      signal.signalDate ===
      latestDateByStrategy.get(`${signal.strategyId}|${signal.strategyVersion}`)
  );
}

function metricValue(value: unknown): JournalMetric {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

function normalizeSignalDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  return String(value).trim().substring(0, 10);
}

function dateValue(value: unknown): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(String(value || ''));
  return parsed;
}

export async function readStrategyRecords(sheets: RequestScopedSheets): Promise<TradingStrategy[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.strategies);
  return table.rows
    .filter((row) => hasMeaningfulTableRow(row))
    .map((row) =>
      normalizeTradingStrategy({
        id: textValue(valueByHeader(table.headers, row, 'Strategy ID')),
        name: textValue(valueByHeader(table.headers, row, 'Name')),
        type: textValue(valueByHeader(table.headers, row, 'Type')),
        enabled: requiredBoolean(valueByHeader(table.headers, row, 'Enabled'), 'Enabled'),
        description: textValue(valueByHeader(table.headers, row, 'Description'))
      })
    );
}

export async function readStrategyVersionRecords(
  sheets: RequestScopedSheets
): Promise<TradingStrategyVersion[]> {
  const table = await readTable(sheets, SHEET_DEFINITIONS.strategyVersions);
  return table.rows
    .filter((row) => hasMeaningfulTableRow(row))
    .map((row) =>
      normalizeTradingStrategyVersion({
        strategyId: textValue(valueByHeader(table.headers, row, 'Strategy ID')),
        version: textValue(valueByHeader(table.headers, row, 'Version')),
        enabled: requiredBoolean(valueByHeader(table.headers, row, 'Enabled'), 'Enabled'),
        screenerCode: textValue(valueByHeader(table.headers, row, 'Screener Code')),
        screener: textValue(valueByHeader(table.headers, row, 'Screener')),
        screenerUrl: textValue(valueByHeader(table.headers, row, 'Finviz URL'))
      })
    );
}

function hasMeaningfulTableRow(row: readonly unknown[]): boolean {
  return row.some(
    (value) => value === true || (typeof value !== 'boolean' && String(value ?? '').trim() !== '')
  );
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (value === true || value === false) return value;
  const text = textValue(value).toUpperCase();
  if (text === 'TRUE') return true;
  if (text === 'FALSE') return false;
  throw new Error(`${label} obligatoire.`);
}
