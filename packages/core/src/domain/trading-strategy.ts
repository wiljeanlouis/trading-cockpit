export interface TradingStrategy {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
}

export function normalizeTradingStrategyId(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Normalizes stable Strategy identity and metadata. Provider URLs are runtime Discovery inputs,
 * not Strategy configuration.
 */
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
