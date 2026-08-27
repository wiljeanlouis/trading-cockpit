import type { Position } from '../../core/domain/position';

export interface PositionRepository {
  findById(id: string): Position | null;
  findOpenByTradePlanId(tradePlanId: string): Position | null;
  save(position: Position): void;
  close(position: Position): void;
}
