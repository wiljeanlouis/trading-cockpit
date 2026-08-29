import type { Position } from '../../core/domain/position';

export interface PositionReader {
  findAll(): Position[];
}
