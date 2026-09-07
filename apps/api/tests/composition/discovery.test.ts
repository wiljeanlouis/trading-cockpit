import { describe, expect, it } from 'vitest';
import { buildFinvizFeeds } from '../../src/composition/discovery';

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

const versions = [
  {
    strategyId: 'MOMENTUM_BREAKOUT',
    version: 'V1',
    enabled: true,
    screenerCode: 'MOMENTUM_BREAKOUT_V1',
    screener: 'FINVIZ',
    screenerUrl: 'v=151&f=momentum'
  },
  {
    strategyId: 'QUALITY_DIP',
    version: 'V1',
    enabled: true,
    screenerCode: 'QUALITY_DIP_V1',
    screener: 'FINVIZ',
    screenerUrl: 'v=151&f=quality'
  },
  {
    strategyId: 'QUALITY_DIP',
    version: 'V0',
    enabled: false,
    screenerCode: 'QUALITY_DIP_V0',
    screener: 'FINVIZ',
    screenerUrl: 'v=151&f=old'
  },
  {
    strategyId: 'DISABLED_STRATEGY',
    version: 'V1',
    enabled: true,
    screenerCode: 'DISABLED_STRATEGY_V1',
    screener: 'FINVIZ',
    screenerUrl: 'v=151&f=disabled'
  }
] as const;

describe('Discovery signal refresh composition', () => {
  it('builds only the selected strategy Finviz feed', () => {
    expect(buildFinvizFeeds({ strategies, versions, strategyId: 'quality_dip' })).toEqual([
      {
        id: 'QUALITY_DIP_V1',
        strategyId: 'QUALITY_DIP',
        strategyName: 'Quality Dip',
        strategyVersion: 'V1',
        query: 'v=151&f=quality'
      }
    ]);
  });

  it('builds all enabled Finviz feeds without disabled parent strategies', () => {
    expect(buildFinvizFeeds({ strategies, versions }).map((feed) => feed.id)).toEqual([
      'MOMENTUM_BREAKOUT_V1',
      'QUALITY_DIP_V1'
    ]);
  });

  it('rejects an unknown selected strategy', () => {
    expect(() => buildFinvizFeeds({ strategies, versions, strategyId: 'UNKNOWN' })).toThrow(
      'Stratégie inconnue : UNKNOWN'
    );
  });

  it('rejects a disabled selected strategy before provider calls are configured', () => {
    expect(() =>
      buildFinvizFeeds({ strategies, versions, strategyId: 'DISABLED_STRATEGY' })
    ).toThrow('La stratégie DISABLED_STRATEGY est désactivée.');
  });

  it('rejects a selected strategy without an active version', () => {
    expect(() =>
      buildFinvizFeeds({
        strategies,
        versions: versions.filter((version) => version.strategyId !== 'QUALITY_DIP'),
        strategyId: 'QUALITY_DIP'
      })
    ).toThrow('Aucune version active pour QUALITY_DIP.');
  });
});
