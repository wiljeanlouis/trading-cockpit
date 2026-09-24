import { describe, expect, it } from 'vitest';
import { buildFinvizFeed } from '../../src/composition/discovery';

const strategies = [
  {
    id: 'MOMENTUM_BREAKOUT',
    name: 'Momentum Breakout',
    type: 'MOMENTUM',
    enabled: true,
    description: ''
  },
  {
    id: 'QUALITY_DIP',
    name: 'Quality Dip',
    type: 'MEAN_REVERSION',
    enabled: true,
    description: ''
  },
  {
    id: 'DISABLED_STRATEGY',
    name: 'Disabled Strategy',
    type: 'MOMENTUM',
    enabled: false,
    description: ''
  }
] as const;

describe('Discovery signal refresh composition', () => {
  it('builds one Finviz feed from the selected Strategy and runtime URL', () => {
    expect(
      buildFinvizFeed({
        strategies,
        strategyId: 'quality_dip',
        finvizUrl: 'https://elite.finviz.com/export/screener?v=151&f=quality'
      })
    ).toEqual({
      id: 'DISCOVERY_QUALITY_DIP',
      strategyId: 'QUALITY_DIP',
      strategyName: 'Quality Dip',
      query: 'https://elite.finviz.com/export/screener?v=151&f=quality'
    });
  });

  it('rejects an unknown selected strategy', () => {
    expect(() =>
      buildFinvizFeed({
        strategies,
        strategyId: 'UNKNOWN',
        finvizUrl: 'https://elite.finviz.com/export/screener?v=151'
      })
    ).toThrow('Stratégie inconnue : UNKNOWN');
  });

  it('rejects a disabled selected strategy before provider calls are configured', () => {
    expect(() =>
      buildFinvizFeed({
        strategies,
        strategyId: 'DISABLED_STRATEGY',
        finvizUrl: 'https://elite.finviz.com/export/screener?v=151'
      })
    ).toThrow('La stratégie DISABLED_STRATEGY est désactivée.');
  });
});
