import type { Position } from '../../domain/position';

export interface PositionReader {
  findAll(): Position[];
}
