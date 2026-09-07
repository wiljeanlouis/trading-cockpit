import { describe, expect, it, vi } from 'vitest';
import { CloudRunFinvizMarketSignalSource } from '../../src/adapters/outbound/finviz/finviz-market-signal-source';
import type { AsyncFinvizTokenService } from '../../src/adapters/outbound/finviz/finviz-token-service';

describe('CloudRunFinvizMarketSignalSource', () => {
  it('preloads configured Finviz feeds sequentially', async () => {
    const order: string[] = [];
    const source = new CloudRunFinvizMarketSignalSource(
      '',
      [
        {
          id: 'MOMENTUM_BREAKOUT_V1',
          strategyId: 'MOMENTUM_BREAKOUT',
          strategyName: 'Momentum Breakout',
          strategyVersion: 'V1',
          query: 'v=151&f=momentum'
        },
        {
          id: 'QUALITY_DIP_V1',
          strategyId: 'QUALITY_DIP',
          strategyName: 'Quality Dip',
          strategyVersion: 'V1',
          query: 'v=151&f=quality'
        }
      ],
      {
        getToken: vi.fn(async () => 'token'),
        setToken: vi.fn(),
        isConfigured: vi.fn(async () => true),
        deleteToken: vi.fn()
      } as unknown as AsyncFinvizTokenService,
      {
        fetch: vi.fn(async (url: string) => {
          order.push(`start:${url}`);
          await Promise.resolve();
          order.push(`end:${url}`);
          return { status: 200, content: 'Ticker,Price\nBOX,34' };
        }),
        parseCsv: vi.fn(() => [
          ['Ticker', 'Price'],
          ['BOX', '34']
        ])
      }
    );

    await source.preload();

    expect(order).toEqual([
      'start:?v=151&f=momentum&auth=token',
      'end:?v=151&f=momentum&auth=token',
      'start:?v=151&f=quality&auth=token',
      'end:?v=151&f=quality&auth=token'
    ]);
  });
});
