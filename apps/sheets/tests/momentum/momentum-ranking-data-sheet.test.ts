/// <reference types="google-apps-script" />

import { describe, expect, it, vi } from 'vitest';
import { GoogleSheetsMomentumRankingReader } from '../../src/adapters/outbound/google-sheets/momentum/google-sheets-momentum-ranking-reader';
import { MOMENTUM_RANKING_HEADERS } from '../../src/adapters/outbound/google-sheets/momentum/momentum-ranking-schema';
import { GoogleSheetsMomentumRankingProjection } from '../../src/adapters/outbound/google-sheets/momentum/google-sheets-momentum-ranking-projection';
import { createMomentumRankingInSheets } from '../../src/adapters/inbound/google-sheets/ui/setup-momentum-ranking';

function rowFor(headers: readonly string[], values: Record<string, unknown>): unknown[] {
  return headers.map((header) => values[header] ?? '');
}

class MockSheet {
  values: unknown[][];
  readonly calls: unknown[][] = [];
  readonly ranges: Array<{ row: number; column: number; rows?: number; columns?: number }> = [];
  readonly clear = vi.fn(() => {
    this.values = [];
  });
  readonly getMaxRows = vi.fn(() => 100);
  readonly getMaxColumns = vi.fn(() => 30);
  readonly setFrozenRows = vi.fn();
  readonly autoResizeColumns = vi.fn();
  readonly setRowHeight = vi.fn();
  readonly setConditionalFormatRules = vi.fn();

  constructor(values: unknown[][]) {
    this.values = values.map((row) => [...row]);
  }

  getLastRow(): number {
    for (let index = this.values.length - 1; index >= 0; index -= 1) {
      if ((this.values[index] ?? []).some((value) => String(value || '').trim())) return index + 1;
    }
    return 0;
  }

  getLastColumn(): number {
    return Math.max(0, ...this.values.map((row) => row.length));
  }

  getRange(row: number, column: number, rows?: number, columns?: number) {
    this.ranges.push({ row, column, rows, columns });
    const range = {
      getValues: () => {
        const rowCount = rows ?? 1;
        const columnCount = columns ?? 1;
        return Array.from({ length: rowCount }, (_, rowOffset) =>
          Array.from(
            { length: columnCount },
            (_value, columnOffset) =>
              this.values[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ''
          )
        );
      },
      setValues: (values: unknown[][]) => {
        values.forEach((sourceRow, rowOffset) => {
          const targetRow = row - 1 + rowOffset;
          this.values[targetRow] = this.values[targetRow] ?? [];
          sourceRow.forEach((value, columnOffset) => {
            this.values[targetRow][column - 1 + columnOffset] = value;
          });
        });
        this.calls.push(['setValues', row, column, values]);
        return range;
      },
      setFontWeight: vi.fn(() => range),
      setFontColor: vi.fn(() => range),
      setFontSize: vi.fn(() => range),
      setBackground: vi.fn(() => range),
      setBorder: vi.fn(() => range),
      clearDataValidations: vi.fn(() => range),
      setDataValidation: vi.fn(() => range),
      setNumberFormat: vi.fn(() => range)
    };
    return range;
  }
}

function installSpreadsheet(sheet: MockSheet) {
  vi.stubGlobal('SpreadsheetApp', {
    getActiveSpreadsheet: () => ({
      getSheetByName: () => sheet,
      insertSheet: () => sheet,
      getSpreadsheetTimeZone: () => 'America/Montreal'
    }),
    newDataValidation: () => {
      const builder = {
        requireValueInList: vi.fn(() => builder),
        setAllowInvalid: vi.fn(() => builder),
        build: vi.fn(() => 'RULE')
      };
      return builder;
    },
    newConditionalFormatRule: () => {
      const builder = {
        whenNumberGreaterThanOrEqualTo: vi.fn(() => builder),
        whenNumberBetween: vi.fn(() => builder),
        setBackground: vi.fn(() => builder),
        setFontColor: vi.fn(() => builder),
        setRanges: vi.fn(() => builder),
        build: vi.fn(() => 'FORMAT_RULE')
      };
      return builder;
    },
    BorderStyle: { SOLID: 'SOLID' }
  });
  vi.stubGlobal('Utilities', {
    formatDate: (date: Date) => date.toISOString().substring(0, 10)
  });
}

describe('Momentum Ranking DATA sheet contract', () => {
  it('reads normalized row-1 headers and row-2 records', () => {
    const sheet = new MockSheet([
      [...MOMENTUM_RANKING_HEADERS],
      rowFor(MOMENTUM_RANKING_HEADERS, {
        Rank: 1,
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Strategy: 'Momentum Breakout',
        'Strategy Version': 'V1',
        'Signal Date': new Date('2026-08-27T00:00:00.000Z'),
        Ticker: 'box',
        Company: 'Box Inc',
        Price: 34.98,
        'Momentum Score': 87,
        'Review Status': 'READY'
      })
    ]);
    installSpreadsheet(sheet);

    expect(new GoogleSheetsMomentumRankingReader().findAll()).toEqual([
      expect.objectContaining({
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyVersion: 'V1',
        signalDate: '2026-08-27',
        ticker: 'BOX',
        total: 87,
        reviewStatus: 'READY'
      })
    ]);
    expect(sheet.ranges).toContainEqual({ row: 1, column: 1, rows: 2, columns: 21 });
    vi.unstubAllGlobals();
  });

  it('does not use the historical row-5 layout during normal reads', () => {
    const sheet = new MockSheet([
      ['MOMENTUM BREAKOUT RANKING V1'],
      ['Signal Date: 2026-08-27'],
      ['Score de priorisation seulement — pas un signal d’achat.'],
      [],
      [...MOMENTUM_RANKING_HEADERS],
      rowFor(MOMENTUM_RANKING_HEADERS, {
        Rank: 1,
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Strategy: 'Momentum Breakout',
        'Strategy Version': 'V1',
        'Signal Date': new Date('2026-08-27T00:00:00.000Z'),
        Ticker: 'URNB',
        'Momentum Score': 91
      })
    ]);
    installSpreadsheet(sheet);

    expect(new GoogleSheetsMomentumRankingReader().findAll()).toEqual([]);
    expect(sheet.ranges).not.toContainEqual({ row: 5, column: 1, rows: 2, columns: 21 });
    vi.unstubAllGlobals();
  });

  it('writes normalized setup headers at row 1', () => {
    const sheet = new MockSheet([]);
    installSpreadsheet(sheet);

    createMomentumRankingInSheets();

    expect(sheet.values[0]).toEqual([...MOMENTUM_RANKING_HEADERS]);
    expect(sheet.setFrozenRows).toHaveBeenCalledWith(1);
    vi.unstubAllGlobals();
  });

  it('projects ranking records at row 1 and row 2', () => {
    const sheet = new MockSheet([]);
    installSpreadsheet(sheet);

    new GoogleSheetsMomentumRankingProjection().replace(
      [
        {
          strategyId: 'MOMENTUM_BREAKOUT',
          strategy: 'Momentum Breakout',
          strategyVersion: 'V1',
          signalDate: '2026-08-27',
          ticker: 'BOX',
          company: 'Box Inc',
          sector: 'Technology',
          price: 34.98,
          high52: 0.01,
          high52Score: 25,
          relativeVolume: 1.5,
          relativeVolumeScore: 20,
          performanceMonth: 0.12,
          performanceScore: 14,
          rsi: 61,
          rsiScore: 15,
          sma20: 0.04,
          sma20Score: 15,
          total: 89
        }
      ],
      '2026-08-27',
      { id: 'MOMENTUM_BREAKOUT', name: 'Momentum Breakout', version: 'V1', enabled: true }
    );

    expect(sheet.values[0]).toEqual([...MOMENTUM_RANKING_HEADERS]);
    expect(sheet.values[1]?.[0]).toBe(1);
    expect(sheet.values[1]?.[5]).toBe('BOX');
    expect(sheet.setFrozenRows).toHaveBeenCalledWith(1);
    vi.unstubAllGlobals();
  });
});
