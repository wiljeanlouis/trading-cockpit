import type { JournalEntry } from '../../core/domain/journal-entry';

export interface JournalReader {
  findAll(): JournalEntry[];
}
