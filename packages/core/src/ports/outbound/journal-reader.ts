import type { JournalEntry } from '../../domain/journal-entry';

export interface JournalReader {
  findAll(): JournalEntry[];
}
