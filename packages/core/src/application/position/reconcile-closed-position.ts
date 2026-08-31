import { createJournalEntryFromClosedPosition } from '../../domain/journal-entry';
import type { Position } from '../../domain/position';
import type { JournalRepository } from '../../ports/outbound/journal-repository';
import type { PositionRepository } from '../../ports/outbound/position-repository';
import type { RuntimePort } from '../../ports/outbound/runtime-port';
import type { WatchlistRepository } from '../../ports/outbound/watchlist-repository';

export interface ReconcileClosedPositionCommand {
  positionId: string;
}

export type JournalReconciliation = 'CREATED' | 'ALREADY_PRESENT' | 'INCONSISTENT' | 'NOT_CHECKED';
export type WatchlistReconciliation = 'UPDATED' | 'ALREADY_CLOSED' | 'NOT_UPDATED';
export type ReconciliationStatus = 'RECONCILED' | 'NO_ACTION' | 'BLOCKED';

export interface ReconcileClosedPositionResult {
  positionId: string;
  journal: JournalReconciliation;
  watchlist: WatchlistReconciliation;
  status: ReconciliationStatus;
  diagnostics: string[];
}

export interface ReconcileClosedPositionDependencies {
  positionRepository: PositionRepository;
  journalRepository: JournalRepository;
  watchlistRepository: WatchlistRepository;
  runtime: RuntimePort;
  observe?: (event: string, fields: Record<string, unknown>) => void;
}

export type ReconcileClosedPosition = (
  command: ReconcileClosedPositionCommand
) => ReconcileClosedPositionResult;

const REQUIRED_TEXT_FIELDS: Array<[keyof Position, string]> = [
  ['accountId', 'Account ID'],
  ['tradePlanId', 'Trade Plan ID'],
  ['watchlistId', 'Watchlist ID'],
  ['strategyId', 'Strategy ID'],
  ['strategyName', 'Strategy'],
  ['strategyVersion', 'Strategy Version'],
  ['ticker', 'Ticker']
];

function missingJournalSnapshotFields(position: Position): string[] {
  const missing = REQUIRED_TEXT_FIELDS.filter(
    ([field]) => !String(position[field] || '').trim()
  ).map(([, label]) => label);

  if (!position.closedAt) missing.push('Closed At');
  if (position.actualEntry === '' || position.actualEntry === null) missing.push('Actual Entry');
  if (position.exitPrice === '' || position.exitPrice === null) missing.push('Exit Price');
  if (position.actualQuantity === '' || position.actualQuantity === null)
    missing.push('Actual Quantity');
  if (position.realizedPnl === '' || position.realizedPnl === null) missing.push('Realized P&L');

  return missing;
}

function blocked(
  positionId: string,
  diagnostic: string,
  journal: JournalReconciliation = 'NOT_CHECKED'
): ReconcileClosedPositionResult {
  return {
    positionId,
    journal,
    watchlist: 'NOT_UPDATED',
    status: 'BLOCKED',
    diagnostics: [diagnostic]
  };
}

export function createReconcileClosedPosition({
  positionRepository,
  journalRepository,
  watchlistRepository,
  runtime,
  observe
}: ReconcileClosedPositionDependencies): ReconcileClosedPosition {
  return ({ positionId }) => {
    const normalizedPositionId = String(positionId || '').trim();

    if (!normalizedPositionId) return blocked('', 'Position ID absent.');

    const position = positionRepository.findById(normalizedPositionId);
    if (!position) {
      return blocked(normalizedPositionId, `Position ID introuvable : ${normalizedPositionId}`);
    }

    const normalizedStatus = String(position.status || '')
      .trim()
      .toUpperCase();
    observe?.('POSITION_LOADED', {
      positionId: normalizedPositionId,
      accountId: position.accountId,
      status: normalizedStatus
    });
    if (normalizedStatus !== 'CLOSED') {
      return blocked(normalizedPositionId, `${position.ticker} n'est pas une position CLOSED.`);
    }

    const missingFields = missingJournalSnapshotFields(position);
    if (missingFields.length > 0) {
      return blocked(
        normalizedPositionId,
        `Snapshot Position insuffisant : ${missingFields.join(', ')}.`
      );
    }

    const journals = journalRepository.findAllByPositionId(normalizedPositionId);
    observe?.('JOURNAL_CARDINALITY', { count: journals.length });
    if (journals.length > 1) {
      return blocked(
        normalizedPositionId,
        `${journals.length} entrées Journal trouvées pour Position ${normalizedPositionId}.`,
        'INCONSISTENT'
      );
    }

    let journal: JournalReconciliation = 'ALREADY_PRESENT';
    if (journals.length === 0) {
      const entry = createJournalEntryFromClosedPosition(position, runtime.newId());
      try {
        journalRepository.save(entry);
      } catch (error) {
        observe?.('TECHNICAL_FAILURE', {
          stage: 'JOURNAL_SAVE',
          positionId: normalizedPositionId,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
      journal = 'CREATED';
    }
    observe?.('JOURNAL_ACTION', { action: journal });

    const watchlist = watchlistRepository.findById(position.watchlistId);
    if (!watchlist) {
      return blocked(
        normalizedPositionId,
        `Watchlist ID introuvable : ${position.watchlistId}`,
        journal
      );
    }

    const watchlistAlreadyClosed =
      String(watchlist.status || '')
        .trim()
        .toUpperCase() === 'CLOSED';
    if (watchlistAlreadyClosed) {
      const result: ReconcileClosedPositionResult = {
        positionId: normalizedPositionId,
        journal,
        watchlist: 'ALREADY_CLOSED',
        status: journal === 'CREATED' ? 'RECONCILED' : 'NO_ACTION',
        diagnostics: []
      };
      observe?.('WATCHLIST_ACTION', { action: result.watchlist });
      observe?.('RESULT', {
        positionId: result.positionId,
        journal: result.journal,
        watchlist: result.watchlist,
        overall: result.status,
        diagnostics: result.diagnostics.length
      });
      return result;
    }

    try {
      watchlistRepository.updateStatus(position.watchlistId, 'CLOSED');
    } catch (error) {
      observe?.('TECHNICAL_FAILURE', {
        stage: 'WATCHLIST_STATUS_UPDATE',
        positionId: normalizedPositionId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
    const result: ReconcileClosedPositionResult = {
      positionId: normalizedPositionId,
      journal,
      watchlist: 'UPDATED',
      status: 'RECONCILED',
      diagnostics: []
    };
    observe?.('WATCHLIST_ACTION', { action: result.watchlist });
    observe?.('RESULT', {
      positionId: result.positionId,
      journal: result.journal,
      watchlist: result.watchlist,
      overall: result.status,
      diagnostics: result.diagnostics.length
    });
    return result;
  };
}
