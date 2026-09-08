export type WatchlistSnapshotValue = string | number | boolean | Date | null;

export const INITIAL_WATCHLIST_STATUS = 'WATCHING' as const;
export const TERMINAL_WATCHLIST_STATUSES = ['CLOSED', 'REJECTED'] as const;
export const SETUP_STATUSES = [
  'WAITING_FOR_SETUP',
  'WAITING_FOR_TRIGGER',
  'TRIGGERED',
  'INVALIDATED'
] as const;
export type SetupStatus = (typeof SETUP_STATUSES)[number];

export interface WatchlistIdentity {
  strategyId: string;
  strategyVersion: string;
  ticker: string;
}

export interface WatchlistCandidate {
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: WatchlistSnapshotValue;
  ticker: WatchlistSnapshotValue;
  company: WatchlistSnapshotValue;
  sector: WatchlistSnapshotValue;
  signalPrice: WatchlistSnapshotValue;
}

export interface NormalizedWatchlistCandidate extends WatchlistCandidate {
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  ticker: string;
}

export interface WatchlistEntry {
  id: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: WatchlistSnapshotValue;
  ticker: string;
  company: WatchlistSnapshotValue;
  sector: WatchlistSnapshotValue;
  addedAt: WatchlistSnapshotValue;
  signalPrice: WatchlistSnapshotValue;
  currentPrice: WatchlistSnapshotValue;
  status: string;
  setupStatus: string;
  triggerLevel: WatchlistSnapshotValue;
  invalidationLevel: WatchlistSnapshotValue;
  earningsDate: WatchlistSnapshotValue;
  eventRisk: string;
  notes: string;
  closedAt: WatchlistSnapshotValue;
}

export function normalizeStrategyId(value: string): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

export function normalizeStrategyVersion(value: string): string {
  return String(value || '').trim();
}

export function normalizeTicker(value: WatchlistSnapshotValue): string {
  return String(value).trim().toUpperCase();
}

export function normalizeWatchlistCandidate(
  candidate: WatchlistCandidate
): NormalizedWatchlistCandidate {
  const strategyId = normalizeStrategyId(candidate.strategyId);
  const strategyName = String(candidate.strategyName || '').trim();
  const strategyVersion = normalizeStrategyVersion(candidate.strategyVersion);

  if (!strategyId) {
    throw new Error('Strategy ID absent de la ligne sélectionnée.');
  }

  if (!strategyName) {
    throw new Error('Strategy absente de la ligne sélectionnée.');
  }

  if (!strategyVersion) {
    throw new Error('Strategy Version absente de la ligne sélectionnée.');
  }

  if (!candidate.signalDate) {
    throw new Error('Signal Date absente de la ligne sélectionnée.');
  }

  if (!candidate.ticker) {
    throw new Error('Ticker absent de la ligne sélectionnée.');
  }

  return {
    ...candidate,
    strategyId,
    strategyName,
    strategyVersion,
    ticker: normalizeTicker(candidate.ticker)
  };
}

export function watchlistIdentityOf(
  candidate: Pick<
    WatchlistEntry | NormalizedWatchlistCandidate,
    'strategyId' | 'strategyVersion' | 'ticker'
  >
): WatchlistIdentity {
  return {
    strategyId: normalizeStrategyId(candidate.strategyId),
    strategyVersion: normalizeStrategyVersion(candidate.strategyVersion),
    ticker: normalizeTicker(candidate.ticker)
  };
}

export function sameWatchlistIdentity(left: WatchlistIdentity, right: WatchlistIdentity): boolean {
  const normalizedLeft = watchlistIdentityOf(left);
  const normalizedRight = watchlistIdentityOf(right);

  return (
    normalizedLeft.strategyId === normalizedRight.strategyId &&
    normalizedLeft.strategyVersion === normalizedRight.strategyVersion &&
    normalizedLeft.ticker === normalizedRight.ticker
  );
}

export function isActiveWatchlistStatus(status: string): boolean {
  const normalizedStatus = String(status || '')
    .trim()
    .toUpperCase();

  return !TERMINAL_WATCHLIST_STATUSES.some((terminalStatus) => terminalStatus === normalizedStatus);
}

export function normalizeSetupStatus(status: string): SetupStatus {
  const normalizedStatus = String(status || '')
    .trim()
    .toUpperCase();

  if (SETUP_STATUSES.some((setupStatus) => setupStatus === normalizedStatus)) {
    return normalizedStatus as SetupStatus;
  }

  throw new Error(`Setup Status inconnu : ${status}`);
}

export function assertSetupStatusTransition(current: string, next: string): SetupStatus {
  const from = normalizeSetupStatus(current || 'WAITING_FOR_SETUP');
  const to = normalizeSetupStatus(next);
  const allowed: Record<SetupStatus, readonly SetupStatus[]> = {
    WAITING_FOR_SETUP: ['WAITING_FOR_TRIGGER', 'INVALIDATED'],
    WAITING_FOR_TRIGGER: ['TRIGGERED', 'INVALIDATED'],
    TRIGGERED: ['INVALIDATED'],
    INVALIDATED: []
  };

  if (!allowed[from].includes(to)) {
    throw new Error(`Transition Setup Status invalide : ${from} → ${to}`);
  }

  return to;
}

export function createWatchlistEntry(
  candidate: NormalizedWatchlistCandidate,
  id: string,
  addedAt: Date
): WatchlistEntry {
  return {
    id,
    strategyId: candidate.strategyId,
    strategyName: candidate.strategyName,
    strategyVersion: candidate.strategyVersion,
    signalDate: candidate.signalDate,
    ticker: candidate.ticker,
    company: candidate.company,
    sector: candidate.sector,
    addedAt,
    signalPrice: candidate.signalPrice,
    currentPrice: '',
    status: INITIAL_WATCHLIST_STATUS,
    setupStatus: 'WAITING_FOR_SETUP',
    triggerLevel: '',
    invalidationLevel: '',
    earningsDate: '',
    eventRisk: '',
    notes: '',
    closedAt: ''
  };
}
