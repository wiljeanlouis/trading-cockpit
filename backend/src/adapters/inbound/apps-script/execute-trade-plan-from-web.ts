import type { ExecuteTradePlanRequest, ExecuteTradePlanResponse } from '@trading-cockpit/contracts';
import type { OpenPositionFromTradePlan } from '@trading-cockpit/backend-core/application/position/open-position-from-trade-plan';
import type { PositionSnapshotValue } from '@trading-cockpit/backend-core/domain/position';

function serializedDate(value: PositionSnapshotValue): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: PositionSnapshotValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function executeTradePlanFromWeb(
  openPosition: OpenPositionFromTradePlan,
  request: ExecuteTradePlanRequest
): ExecuteTradePlanResponse {
  const result = openPosition({ tradePlanId: String(request?.tradePlanId ?? '') });
  const position = result.kind === 'opened' ? result.position : result.existing;
  return {
    kind: result.kind,
    positionId: position.id,
    tradePlanId: position.tradePlanId,
    accountId: position.accountId,
    ticker: position.ticker,
    openedAt: serializedDate(position.openedAt),
    actualEntry: nullableNumber(position.actualEntry),
    actualQuantity: nullableNumber(position.actualQuantity),
    positionStatus: position.status
  };
}
