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
  observe?: (event: string, fields: Record<string, unknown>) => void;
}

export type ClosePosition = (command: ClosePositionCommand) => ClosePositionResult;

export function createClosePosition({
  positionRepository,
  journalRepository,
  watchlistRepository,
  runtime,
  observe
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

    if (!current.accountId) {
      throw new Error('Account ID absent.');
    }

    if (!current.strategyId) {
      throw new Error('Strategy ID absent.');
    }

    observe?.('POSITION_LOADED', {
      positionId: current.id,
      accountId: current.accountId,
      ticker: current.ticker,
      exitPrice
    });

    const closed = closePosition(current, exitPrice, runtime.now());
    try {
      positionRepository.close(closed);
      observe?.('POSITION_CLOSE_PERSISTED', {
        positionId: closed.id,
        realizedPnl: closed.realizedPnl
      });
    } catch (error) {
      observe?.('TECHNICAL_FAILURE', {
        stage: 'POSITION_SAVE',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    let existingJournal: JournalEntry | null;
    try {
      existingJournal = journalRepository.findByPositionId(closed.id);
      observe?.('JOURNAL_LOOKUP', { found: Boolean(existingJournal) });
    } catch (error) {
      observe?.('PARTIAL_FAILURE', {
        stage: 'JOURNAL_LOOKUP',
        positionId: closed.id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
    let journalEntry = existingJournal;
    let journalCreated = false;

    if (!existingJournal) {
      journalEntry = createJournalEntryFromClosedPosition(closed, runtime.newId());
      try {
        journalRepository.save(journalEntry);
      } catch (error) {
        observe?.('PARTIAL_FAILURE', {
          stage: 'JOURNAL_CREATION',
          positionId: closed.id,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
      journalCreated = true;
    }
    observe?.(journalCreated ? 'JOURNAL_CREATED' : 'JOURNAL_ALREADY_PRESENT', {
      positionId: closed.id
    });

    try {
      watchlistRepository.updateStatus(closed.watchlistId, 'CLOSED');
      observe?.('WATCHLIST_STATUS_UPDATED', { watchlistId: closed.watchlistId, status: 'CLOSED' });
    } catch (error) {
      observe?.('PARTIAL_FAILURE', {
        stage: 'WATCHLIST_UPDATE',
        positionId: closed.id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    return { position: closed, journalEntry, journalCreated };
  };
}
