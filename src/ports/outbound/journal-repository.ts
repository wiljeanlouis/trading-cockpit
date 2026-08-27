import type { JournalEntry } from '../../core/domain/journal-entry';

export interface JournalRepository {
  findByPositionId(positionId: string): JournalEntry | null;
  save(entry: JournalEntry): void;
}
