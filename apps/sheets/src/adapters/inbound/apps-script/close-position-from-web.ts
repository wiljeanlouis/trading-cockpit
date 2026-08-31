import type { ClosePositionRequest, ClosePositionResponse } from '@trading-cockpit/contracts';
import type { ClosePosition } from '@trading-cockpit/core/application/position/close-position';
import type { PositionSnapshotValue } from '@trading-cockpit/core/domain/position';

function serializedDate(value: PositionSnapshotValue): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: PositionSnapshotValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function closePositionFromWeb(
  closePosition: ClosePosition,
  request: ClosePositionRequest
): ClosePositionResponse {
  const result = closePosition({
    positionId: String(request?.positionId || '').trim(),
    exitPrice: Number(request?.exitPrice)
  });

  return {
    positionId: result.position.id,
    accountId: result.position.accountId,
    ticker: result.position.ticker,
    status: result.position.status,
    closedAt: serializedDate(result.position.closedAt),
    exitPrice: Number(result.position.exitPrice),
    realizedPnl: nullableNumber(result.position.realizedPnl),
    journalCreated: result.journalCreated
  };
}
