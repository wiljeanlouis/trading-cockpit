export interface TradingStrategySnapshot {
  id: string;
  version: string;
  enabled: boolean;
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
}

export interface TradingStrategyVersion {
  strategyId: string;
  version: string;
  enabled: boolean;
  screenerCode: string;
  screener: string;
  screenerUrl: string;
}

export interface StrategyVersionIdentity {
  strategyId: string;
  version: string;
}

export function normalizeTradingStrategyId(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

export function normalizeTradingStrategyVersionText(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeTradingStrategy(strategy: TradingStrategy): TradingStrategy {
  const id = normalizeTradingStrategyId(strategy.id);
  const name = String(strategy.name ?? '').trim();
  const type = String(strategy.type ?? '')
    .trim()
    .toUpperCase();
  if (!id) throw new Error('Strategy ID obligatoire.');
  if (!name) throw new Error('Strategy Name obligatoire.');
  if (!type) throw new Error('Strategy Type obligatoire.');
  return {
    id,
    name,
    type,
    enabled: Boolean(strategy.enabled),
    description: String(strategy.description ?? '').trim()
  };
}

export function normalizeTradingStrategyVersion(
  version: TradingStrategyVersion
): TradingStrategyVersion {
  const strategyId = normalizeTradingStrategyId(version.strategyId);
  const normalizedVersion = normalizeTradingStrategyVersionText(version.version);
  const screenerCode = String(version.screenerCode ?? '')
    .trim()
    .toUpperCase();
  const screener = String(version.screener ?? '')
    .trim()
    .toUpperCase();
  const screenerUrl = String(version.screenerUrl ?? '').trim();
  if (!strategyId) throw new Error('Strategy ID obligatoire.');
  if (!normalizedVersion) throw new Error('Strategy Version obligatoire.');
  if (!screenerCode) throw new Error('Screener Code obligatoire.');
  if (!screener) throw new Error('Screener obligatoire.');
  if (!screenerUrl) throw new Error('Screener URL obligatoire.');
  return {
    strategyId,
    version: normalizedVersion,
    enabled: Boolean(version.enabled),
    screenerCode,
    screener,
    screenerUrl
  };
}

export function strategyVersionKey(identity: StrategyVersionIdentity): string {
  return `${normalizeTradingStrategyId(identity.strategyId)}|${normalizeTradingStrategyVersionText(identity.version)}`;
}
