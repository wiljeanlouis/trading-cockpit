import { describe, expect, it, vi } from 'vitest';
import {
  FinvizMarketSignalSource,
  type FinvizFeedConfiguration,
  type FinvizTransport
} from '../../src/adapters/outbound/finviz/finviz-market-signal-source';
import { FINVIZ_MOMENTUM_EXPORT_HEADERS } from '@trading-cockpit/contracts';

const config: FinvizFeedConfiguration = {
  id: 'MOMENTUM_V1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: 'V1',
  query: 'v=151&f=cap_smallover'
};

function source(
  response = { status: 200, content: 'csv' },
  rows: unknown[][] = [['Ticker'], ['box']]
) {
  const transport: FinvizTransport = { fetch: vi.fn(() => response), parseCsv: vi.fn(() => rows) };
  return {
    source: new FinvizMarketSignalSource(
      'https://elite.finviz.com/export/screener',
      [config],
      { getToken: () => 'a token' },
      transport
    ),
    transport
  };
}

describe('Finviz market signal adapter', () => {
  it('keeps Finviz URL, auth encoding, HTTP options boundary and CSV mapping', () => {
    const value = source();
    expect(value.source.listFeeds()[0]).not.toHaveProperty('query');
    expect(value.source.fetchSignals(config.id)).toEqual({
      feed: {
        id: 'MOMENTUM_V1',
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyName: 'Momentum Breakout',
        strategyVersion: 'V1'
      },
      attributeNames: ['Ticker'],
      signals: [{ ticker: 'BOX', attributes: { Ticker: 'box' } }]
    });
    expect(value.transport.fetch).toHaveBeenCalledWith(
      'https://elite.finviz.com/export/screener?v=151&f=cap_smallover&auth=a%20token'
    );
  });

  it('preserves every configured Finviz CSV field in the provider-neutral signal batch', () => {
    const values = FINVIZ_MOMENTUM_EXPORT_HEADERS.map((header) =>
      header === 'Ticker' ? 'box' : `${header} value`
    );
    const value = source({ status: 200, content: 'csv' }, [
      [...FINVIZ_MOMENTUM_EXPORT_HEADERS],
      values
    ]);

    const batch = value.source.fetchSignals(config.id);

    expect(batch.attributeNames).toEqual([...FINVIZ_MOMENTUM_EXPORT_HEADERS]);
    expect(Object.keys(batch.signals[0].attributes)).toEqual([...FINVIZ_MOMENTUM_EXPORT_HEADERS]);
    expect(batch.signals[0]).toEqual(
      expect.objectContaining({
        ticker: 'BOX',
        attributes: expect.objectContaining({
          Ticker: 'box',
          'Average Volume': 'Average Volume value',
          '200-Day Simple Moving Average': '200-Day Simple Moving Average value',
          '50-Day Simple Moving Average': '50-Day Simple Moving Average value',
          'Performance (Week)': 'Performance (Week) value',
          'Earnings Date': 'Earnings Date value'
        })
      })
    );
  });

  it.each([
    [{ status: 401, content: 'no' }, 'Finviz API error pour Momentum Breakout: HTTP 401'],
    [{ status: 200, content: ' ' }, 'Finviz a retourné un CSV vide pour Momentum Breakout.']
  ])('translates vendor response %#', (response, message) => {
    expect(() => source(response).source.fetchSignals(config.id)).toThrow(message);
  });

  it('rejects empty parsed CSV with preserved message', () => {
    expect(() =>
      source({ status: 200, content: 'csv' }, []).source.fetchSignals(config.id)
    ).toThrow('Aucune donnée Finviz reçue pour Momentum Breakout.');
  });

  it('contains vendor-specific ticker mapping errors inside the adapter', () => {
    expect(() =>
      source({ status: 200, content: 'csv' }, [['Symbol'], ['BOX']]).source.fetchSignals(config.id)
    ).toThrow('La colonne Ticker est absente de l’export Finviz.');
  });
});
