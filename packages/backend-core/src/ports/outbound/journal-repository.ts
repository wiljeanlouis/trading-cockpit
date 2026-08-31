import type { JournalEntry } from '../../domain/journal-entry';

export interface JournalRepository {
  findByPositionId(positionId: string): JournalEntry | null;
  findAllByPositionId(positionId: string): JournalEntry[];
  findClosedByAccountId(accountId: string): JournalEntry[];
  save(entry: JournalEntry): void;
}
