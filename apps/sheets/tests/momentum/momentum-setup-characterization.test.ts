import { describe, expect, it } from 'vitest';
import { MOMENTUM_RANKING_SETUP_HEADERS } from '../../src/adapters/inbound/google-sheets/ui/setup-momentum-ranking';
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
