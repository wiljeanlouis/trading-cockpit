import { describe, expect, it, vi } from 'vitest';
import { createRefreshMomentumRanking } from '../../src/core/application/momentum/refresh-momentum-ranking';
import type { MomentumCandidate } from '../../src/core/domain/momentum';

function candidate(overrides: Partial<MomentumCandidate> = {}): MomentumCandidate {
  return {
    strategyId: 'MOMENTUM_BREAKOUT',
    strategy: 'Momentum Breakout',
    strategyVersion: 'V1',
    signalDate: '2026-08-27',
    ticker: 'AAA',
    company: 'A',
    sector: 'Tech',
    price: 10,
    high52: -0.01,
    relativeVolume: 1,
    performanceMonth: 0,
    rsi: 50,
    sma20: 0,
    ...overrides
  };
}

describe('refresh momentum ranking', () => {
  it('selects only the latest snapshot, scores it, and sorts by total then relative volume', () => {
    const replace = vi.fn();
    const refresh = createRefreshMomentumRanking({
      strategyRepository: {
        getById: () => ({
          id: 'MOMENTUM_BREAKOUT',
          name: 'Momentum Breakout',
          version: 'V1',
          enabled: true
        })
      },
      signalRepository: {
        findByStrategy: () => [
          candidate({ signalDate: '2026-08-26', ticker: 'OLD', relativeVolume: 3 }),
          candidate({ ticker: 'LOW', relativeVolume: 1 }),
          candidate({ ticker: 'HIGH', relativeVolume: 1.2 })
        ]
      },
      rankingProjection: { replace }
    });

    const result = refresh();
    expect(result.signalDate).toBe('2026-08-27');
    expect(result.ranked.map((item) => item.ticker)).toEqual(['HIGH', 'LOW']);
    expect(result.ranked[0].total).toBe(57);
    expect(replace).toHaveBeenCalledWith(
      result.ranked,
      '2026-08-27',
      expect.objectContaining({ version: 'V1' })
    );
  });

  it('blocks a disabled strategy before reading signals', () => {
    const findByStrategy = vi.fn();
    const refresh = createRefreshMomentumRanking({
      strategyRepository: {
        getById: () => ({
          id: 'MOMENTUM_BREAKOUT',
          name: 'Momentum Breakout',
          version: 'V1',
          enabled: false
        })
      },
      signalRepository: { findByStrategy },
      rankingProjection: { replace: vi.fn() }
    });
    expect(refresh).toThrow('La stratégie MOMENTUM_BREAKOUT est désactivée.');
    expect(findByStrategy).not.toHaveBeenCalled();
  });

  it('preserves the legacy errors for no matching signal and invalid dates', () => {
    const strategyRepository = {
      getById: () => ({
        id: 'MOMENTUM_BREAKOUT',
        name: 'Momentum Breakout',
        version: 'V1',
        enabled: true
      })
    };
    const rankingProjection = { replace: vi.fn() };
    expect(
      createRefreshMomentumRanking({
        strategyRepository,
        rankingProjection,
        signalRepository: { findByStrategy: () => [] }
      })
    ).toThrow('Aucun signal trouvé pour MOMENTUM_BREAKOUT V1.');
    expect(
      createRefreshMomentumRanking({
        strategyRepository,
        rankingProjection,
        signalRepository: { findByStrategy: () => [candidate({ signalDate: '' })] }
      })
    ).toThrow('Aucune Signal Date valide.');
  });
});
