import {
  createJournalEntryFromClosedPosition,
  type JournalEntry
} from '../../domain/journal-entry';
import { closePosition, type Position } from '../../domain/position';
import type { JournalRepository } from '../../../ports/outbound/journal-repository';
import type { PositionRepository } from '../../../ports/outbound/position-repository';
import type { RuntimePort } from '../../../ports/outbound/runtime-port';
import type { WatchlistRepository } from '../../../ports/outbound/watchlist-repository';

export interface ClosePositionCommand {
  positionId: string;
  exitPrice: number;
}

export interface ClosePositionResult {
  position: Position;
  journalEntry: JournalEntry | null;
  journalCreated: boolean;
}

export interface ClosePositionDependencies {
  positionRepository: PositionRepository;
  journalRepository: JournalRepository;
  watchlistRepository: WatchlistRepository;
  runtime: RuntimePort;
}

export type ClosePosition = (command: ClosePositionCommand) => ClosePositionResult;

export function createClosePosition({
  positionRepository,
  journalRepository,
  watchlistRepository,
  runtime
}: ClosePositionDependencies): ClosePosition {
  return ({ positionId, exitPrice }) => {
    const normalizedPositionId = String(positionId || '').trim();

    if (!normalizedPositionId) {
      throw new Error('Position ID absent.');
    }

    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      throw new Error('Le prix de sortie doit être supérieur à 0.');
    }

    const current = positionRepository.findById(normalizedPositionId);

    if (!current) {
      throw new Error(`Position ID introuvable : ${normalizedPositionId}`);
    }

    if (!current.watchlistId) {
      throw new Error('Watchlist ID absent.');
    }

    if (!current.strategyId) {
      throw new Error('Strategy ID absent.');
    }

    const closed = closePosition(current, exitPrice, runtime.now());
    positionRepository.close(closed);

    const existingJournal = journalRepository.findByPositionId(closed.id);
    let journalEntry = existingJournal;
    let journalCreated = false;

    if (!existingJournal) {
      journalEntry = createJournalEntryFromClosedPosition(closed, runtime.newId());
      journalRepository.save(journalEntry);
      journalCreated = true;
    }

    watchlistRepository.updateStatus(closed.watchlistId, 'CLOSED');

    return { position: closed, journalEntry, journalCreated };
  };
}
