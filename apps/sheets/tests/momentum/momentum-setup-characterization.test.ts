import { describe, expect, it } from 'vitest';
import {
  MOMENTUM_SCORE_CONFIG_HEADERS,
  MOMENTUM_RANKING_SETUP_HEADERS,
  MOMENTUM_SCORE_CONFIG_VALUES
} from '../../src/adapters/inbound/google-sheets/ui/setup-momentum-ranking';
import {
  STRATEGY_HEADERS,
  STRATEGY_TYPE_VALUES
} from '../../src/adapters/inbound/google-sheets/ui/setup-strategies';

describe('legacy setup data characterization', () => {
  it('preserves the eight-column Strategies schema and type list', () => {
    expect(STRATEGY_HEADERS).toEqual([
      'Strategy ID',
      'Name',
      'Version',
      'Type',
      'Enabled',
      'Risk %',
      'Max Positions',
      'Description'
    ]);
    expect(STRATEGY_TYPE_VALUES).toEqual([
      'MOMENTUM',
      'BREAKOUT',
      'MEAN_REVERSION',
      'TREND_FOLLOWING',
      'EVENT_DRIVEN',
      'OTHER'
    ]);
  });

  it('preserves the score matrix as a contiguous CONFIG table', () => {
    expect(MOMENTUM_SCORE_CONFIG_HEADERS).toEqual(['Component', 'Condition', 'Points', 'Max']);
    expect(MOMENTUM_SCORE_CONFIG_VALUES).toHaveLength(22);
    expect(MOMENTUM_SCORE_CONFIG_VALUES[0]).toEqual(['52W High', '0% à -1%', 25, 25]);
    expect(MOMENTUM_SCORE_CONFIG_VALUES[18]).toEqual(['SMA20 Extension', '2% à 8%', 15, 15]);
    expect(MOMENTUM_SCORE_CONFIG_VALUES[21]).toEqual(['SMA20 Extension', '> 12%', 5, '']);
    expect(MOMENTUM_SCORE_CONFIG_VALUES).not.toContainEqual(['', '', '', '']);
  });

  it('uses the normalized DATA-sheet ranking schema in setup', () => {
    expect(MOMENTUM_RANKING_SETUP_HEADERS).toHaveLength(21);
    expect(MOMENTUM_RANKING_SETUP_HEADERS).toEqual([
      'Rank',
      'Strategy ID',
      'Strategy',
      'Strategy Version',
      'Signal Date',
      'Ticker',
      'Company',
      'Sector',
      'Price',
      '52W High',
      '52W Score',
      'Relative Volume',
      'RelVol Score',
      'Performance Month',
      'Performance Score',
      'RSI',
      'RSI Score',
      'SMA20',
      'SMA20 Score',
      'Momentum Score',
      'Review Status'
    ]);
  });
});
