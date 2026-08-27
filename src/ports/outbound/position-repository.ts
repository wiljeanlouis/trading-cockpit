import type { Position } from '../../core/domain/position';

export interface PositionRepository {
  findOpenByTradePlanId(tradePlanId: string): Position | null;
  save(position: Position): void;
}
