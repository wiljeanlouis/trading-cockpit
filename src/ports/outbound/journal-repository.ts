import type { JournalEntry } from '../../core/domain/journal-entry';

export interface JournalRepository {
  findByPositionId(positionId: string): JournalEntry | null;
  findAllByPositionId(positionId: string): JournalEntry[];
  save(entry: JournalEntry): void;
}
