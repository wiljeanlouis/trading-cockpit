import type {
  DiscoveryCandidateDto,
  DiscoveryDto,
  DiscoveryStrategyDto
} from '@trading-cockpit/contracts';
import type { SignalSnapshot } from '../../domain/market-signal';
import { normalizeTradingStrategyId, type TradingStrategy } from '../../domain/trading-strategy';
import { isActiveWatchlistStatus, watchlistIdentityOf } from '../../domain/watchlist';
import type { DiscoverySignalReader } from '../../ports/outbound/discovery-signal-reader';
import type { WatchlistReader } from '../../ports/outbound/watchlist-reader';

export interface GetDiscoveryDependencies {
  signalReader: DiscoverySignalReader;
  watchlistReader: WatchlistReader;
  now: () => Date;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function nullableText(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  const normalized = text(value);
  return normalized || null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const normalized = Number(value.replace(/[$,%]/g, ''));
    if (Number.isFinite(normalized)) {
      return value.includes('%') ? normalized / 100 : normalized;
    }
  }
  return null;
}

function serializableAttribute(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function serializableTextOrNumber(value: unknown): string | number | null {
  const normalized = serializableAttribute(value);
  return typeof normalized === 'boolean' ? String(normalized) : normalized;
}

function signalStrategyKey(signal: Pick<SignalSnapshot, 'strategyId'>): string {
  return normalizeTradingStrategyId(signal.strategyId);
}

function watchlistIdentityKey(identity: ReturnType<typeof watchlistIdentityOf>): string {
  return `${identity.strategyId}|${identity.ticker}`;
}

/**
 * Resolves currently discoverable Strategies from canonical strategy configuration. Disabled
 * strategies remain historically readable, but are excluded from new Discovery candidate selection.
 */
function activeDiscoveryStrategies(
  strategies: readonly TradingStrategy[]
): Map<string, DiscoveryStrategyDto> {
  return new Map(
    strategies
      .filter((strategy) => strategy.enabled)
      .map((strategy) => [
        normalizeTradingStrategyId(strategy.id),
        {
          strategyId: strategy.id,
          strategyName: strategy.name,
          strategyType: strategy.type
        }
      ])
  );
}

/**
 * Finds the latest archived signal snapshot per Strategy ID so Discovery reads current candidates
 * without requiring a separate materialized ranking sheet.
 */
function latestSignalDateByStrategy(signals: readonly SignalSnapshot[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const signal of signals) {
    const key = signalStrategyKey(signal);
    const signalDate = text(signal.signalDate);
    if (!signalDate) continue;
    const current = latest.get(key);
    if (!current || signalDate > current) latest.set(key, signalDate);
  }
  return latest;
}

/**
 * Converts a persisted signal snapshot into the serializable Discovery candidate DTO while
 * preserving provider attributes as read-only evidence and enriching active Watchlist status.
 */
function candidateFromSignal(
  signal: SignalSnapshot,
  strategy: DiscoveryStrategyDto,
  activeWatchlistStatuses: ReadonlyMap<string, string>
): DiscoveryCandidateDto {
  const attributes = Object.fromEntries(
    Object.entries(signal.attributes).map(([key, value]) => [key, serializableAttribute(value)])
  );
  const identity = watchlistIdentityOf({
    strategyId: signal.strategyId,
    ticker: signal.ticker
  });

  return {
    strategyId: signal.strategyId,
    strategyName: signal.strategyName || strategy.strategyName,
    signalDate: nullableText(signal.signalDate),
    detectedAt: signal.detectedAt instanceof Date ? signal.detectedAt.toISOString() : null,
    ticker: signal.ticker,
    company: nullableText(signal.attributes.Company),
    sector: nullableText(signal.attributes.Sector),
    industry: nullableText(signal.attributes.Industry),
    country: nullableText(signal.attributes.Country),
    marketCap: serializableTextOrNumber(signal.attributes['Market Cap']),
    volume: nullableNumber(signal.attributes.Volume),
    price: nullableNumber(signal.attributes.Price),
    change: nullableNumber(signal.attributes.Change),
    averageVolume: nullableNumber(signal.attributes['Average Volume']),
    relativeVolume: nullableNumber(signal.attributes['Relative Volume']),
    rsi: nullableNumber(signal.attributes['Relative Strength Index (14)']),
    high52: nullableNumber(signal.attributes['52-Week High']),
    performanceWeek: nullableNumber(signal.attributes['Performance (Week)']),
    performanceMonth: nullableNumber(signal.attributes['Performance (Month)']),
    earningsDate: nullableText(signal.attributes['Earnings Date']),
    attributes,
    watchlistStatus: activeWatchlistStatuses.get(watchlistIdentityKey(identity)) ?? null
  };
}

/**
 * Creates the Discovery read model from Signals History plus active Watchlist entries. This keeps
 * provider refresh/import separate from reading already-archived candidates.
 */
export function createGetDiscovery({
  signalReader,
  watchlistReader,
  now
}: GetDiscoveryDependencies) {
  return (): DiscoveryDto => {
    const activeStrategies = activeDiscoveryStrategies(signalReader.findAllStrategies());
    const signals = signalReader
      .findAllSignals()
      .filter((signal) => activeStrategies.has(signalStrategyKey(signal)));
    const latestDates = latestSignalDateByStrategy(signals);

    const activeWatchlistStatuses = new Map<string, string>();
    for (const entry of watchlistReader.findAll()) {
      if (!isActiveWatchlistStatus(entry.status)) continue;
      const key = watchlistIdentityKey(watchlistIdentityOf(entry));
      if (!activeWatchlistStatuses.has(key)) activeWatchlistStatuses.set(key, entry.status);
    }

    const items = signals
      .filter((signal) => signal.signalDate === latestDates.get(signalStrategyKey(signal)))
      .map((signal) =>
        candidateFromSignal(
          signal,
          activeStrategies.get(signalStrategyKey(signal))!,
          activeWatchlistStatuses
        )
      )
      .sort(
        (left, right) =>
          left.strategyName.localeCompare(right.strategyName, undefined, { sensitivity: 'base' }) ||
          left.ticker.localeCompare(right.ticker, undefined, { sensitivity: 'base' })
      );

    return {
      generatedAt: now().toISOString(),
      strategies: [...activeStrategies.values()].sort((left, right) =>
        left.strategyName.localeCompare(right.strategyName, undefined, { sensitivity: 'base' })
      ),
      items
    };
  };
}
