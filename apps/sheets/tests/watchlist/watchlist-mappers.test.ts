import { describe, expect, it } from 'vitest';
import { rankingRowToAddCandidateCommand } from '../../src/adapters/inbound/google-sheets/ui/ranking-candidate-mapper';
import {
  WATCHLIST_HEADERS,
  watchlistEntryFromRow,
  watchlistEntryToRow
} from '../../src/adapters/outbound/google-sheets/watchlist/watchlist-mapper';
import type { WatchlistEntry } from '@trading-cockpit/core/domain/watchlist';

describe('Momentum Ranking candidate mapper', () => {
  it('copies the exact Watchlist snapshot fields by header', () => {
    const signalDate = new Date('2026-08-27T00:00:00.000Z');
    const headers = [
      'Momentum Score',
      'Ticker',
      'Sector',
      'Strategy Version',
      'Company',
      'Strategy ID',
      'Price',
      'Signal Date',
      'Strategy'
    ];
    const row = [
      88,
      ' urnb ',
      'Consumer Cyclical',
      ' V1 ',
      'Urban Outfitters',
      ' mb ',
      54.25,
      signalDate,
      ' Momentum '
    ];

    expect(rankingRowToAddCandidateCommand(headers, row)).toEqual({
      strategyId: ' mb ',
      strategyName: ' Momentum ',
      strategyVersion: ' V1 ',
      signalDate,
      ticker: ' urnb ',
      company: 'Urban Outfitters',
      sector: 'Consumer Cyclical',
      signalPrice: 54.25,
      momentumScore: 88
    });
  });

  it('fails with the legacy missing-column message', () => {
    expect(() => rankingRowToAddCandidateCommand([], [])).toThrow('Colonne absente : Strategy ID');
  });
});

describe('Watchlist row mapper', () => {
  const addedAt = new Date('2026-08-27T14:00:00.000Z');
  const entry: WatchlistEntry = {
    id: 'watchlist-id',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: 'V1',
    signalDate: '2026-08-27',
    ticker: 'URNB',
    company: 'Urban Outfitters',
    sector: 'Consumer Cyclical',
    addedAt,
    signalPrice: 54.25,
    currentPrice: '',
    momentumScore: 88,
    status: 'WATCHING',
    setupStatus: '',
    breakoutLevel: '',
    invalidationLevel: '',
    earningsDate: '',
    eventRisk: '',
    notes: '',
    closedAt: ''
  };

  it('writes the exact 22-column legacy row and leaves calculated columns empty', () => {
    expect(watchlistEntryToRow(entry)).toEqual([
      'watchlist-id',
      'MOMENTUM_BREAKOUT',
      'Momentum Breakout',
      'V1',
      '2026-08-27',
      'URNB',
      'Urban Outfitters',
      'Consumer Cyclical',
      addedAt,
      54.25,
      '',
      '',
      88,
      'WATCHING',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);
  });

  it('reads a row explicitly by headers, including the current price needed downstream', () => {
    const row = watchlistEntryToRow(entry);
    row[10] = 55;
    row[11] = 0.0138;
    row[16] = -0.02;

    expect(watchlistEntryFromRow([...WATCHLIST_HEADERS], row)).toEqual({
      ...entry,
      currentPrice: 55
    });
  });
});
