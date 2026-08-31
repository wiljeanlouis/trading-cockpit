/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FinvizMarketSignalSource,
  type FinvizTransport
} from '../../src/adapters/outbound/finviz/finviz-market-signal-source';
import { GoogleSheetsFinvizSignalProjection } from '../../src/adapters/outbound/finviz/google-sheets-finviz-signal-projection';
import { createArchiveMarketSignals } from '@trading-cockpit/core/application/market-signals/archive-market-signals';
import { createRefreshMarketSignals } from '@trading-cockpit/core/application/market-signals/refresh-market-signals';
import type { SignalSnapshot } from '@trading-cockpit/core/domain/market-signal';

afterEach(() => vi.unstubAllGlobals());

describe('Finviz runtime regression', () => {
  it('normalizes a shortened CSV row before the Google Sheets write', () => {
    const transport: FinvizTransport = {
      fetch: () => ({ status: 200, content: 'Ticker,Company,Sector,Price\nBOX,Box,Technology' }),
      parseCsv: () => [
        ['Ticker', 'Company', 'Sector', 'Price'],
        ['BOX', 'Box', 'Technology']
      ]
    };
    const source = new FinvizMarketSignalSource(
      'https://elite.finviz.com/export/screener',
      [
        {
          id: 'MOMENTUM_BREAKOUT_V1',
          strategyId: 'MOMENTUM_BREAKOUT',
          strategyName: 'Momentum Breakout',
          strategyVersion: 'V1',
          query: 'v=151'
        }
      ],
      { getToken: () => 'secret' },
      transport
    );
    const written: unknown[][][] = [];
    const range = {
      setValues: vi.fn((rows: unknown[][]) => {
        written.push(rows);
        if (rows.flat().some((value) => value === undefined)) {
          throw new Error('Google Sheets cannot persist undefined cells.');
        }
        return range;
      }),
      setNumberFormat: vi.fn(() => range)
    };
    const sheet = {
      clearContents: vi.fn(),
      getRange: vi.fn(() => range),
      setFrozenRows: vi.fn(),
      autoResizeColumns: vi.fn(),
      getLastColumn: vi.fn(() => 8)
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });
    vi.stubGlobal('themeSimpleSheet', vi.fn());

    const projection = new GoogleSheetsFinvizSignalProjection({
      MOMENTUM_BREAKOUT_V1: 'Finviz - Momentum'
    });
    const snapshots: SignalSnapshot[] = [];
    const archiveSignals = createArchiveMarketSignals({
      repository: {
        ensureReady: vi.fn(),
        loadExistingKeys: () => new Set<string>(),
        append: (entries) => snapshots.push(...entries)
      },
      now: () => new Date('2026-08-28T12:00:00Z'),
      formatSignalDate: () => '2026-08-28'
    });
    const refresh = createRefreshMarketSignals({
      source,
      strategyCatalog: {
        getById: () => ({ id: 'MOMENTUM_BREAKOUT', version: 'V1', enabled: true })
      },
      projection,
      archiveSignals,
      now: () => new Date('2026-08-28T12:00:00Z')
    });

    expect(refresh()).toBe(1);
    expect(written[0][1]).toEqual([
      'MOMENTUM_BREAKOUT',
      'Momentum Breakout',
      'V1',
      new Date('2026-08-28T12:00:00Z'),
      'BOX',
      'Box',
      'Technology',
      ''
    ]);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].attributes.Price).toBe('');
  });
});
