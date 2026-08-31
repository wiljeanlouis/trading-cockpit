/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FINVIZ_MOMENTUM_EXPORT_HEADERS,
  MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS,
  SIGNALS_HISTORY_HEADERS,
  signalsHistoryHeaderForFinvizHeader
} from '@trading-cockpit/contracts';
import { GoogleSheetsSignalHistoryRepository } from '../../src/adapters/outbound/google-sheets/signal-history/google-sheets-signal-history-repository';

class FakeRange {
  constructor(
    private readonly sheet: FakeSheet,
    private readonly row: number,
    private readonly column: number,
    private readonly rows: number,
    private readonly columns: number
  ) {}

  getValues(): unknown[][] {
    return Array.from({ length: this.rows }, (_unusedRow, rowOffset) =>
      Array.from(
        { length: this.columns },
        (_unusedColumn, columnOffset) =>
          this.sheet.values[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ''
      )
    );
  }

  setValues(values: unknown[][]): FakeRange {
    values.forEach((sourceRow, rowOffset) => {
      const targetRow = this.row - 1 + rowOffset;
      this.sheet.values[targetRow] = this.sheet.values[targetRow] ?? [];
      sourceRow.forEach((value, columnOffset) => {
        this.sheet.values[targetRow][this.column - 1 + columnOffset] = value;
      });
    });
    return this;
  }

  setNumberFormat(): FakeRange {
    return this;
  }
  setFontFamily(): FakeRange {
    return this;
  }
  setFontColor(): FakeRange {
    return this;
  }
  setVerticalAlignment(): FakeRange {
    return this;
  }
  setBorder(): FakeRange {
    return this;
  }
  setBackground(): FakeRange {
    return this;
  }
  setFontWeight(): FakeRange {
    return this;
  }
}

class FakeSheet {
  values: unknown[][];

  constructor(values: unknown[][] = []) {
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

  getRange(row: number, column: number, rows: number, columns: number): FakeRange {
    return new FakeRange(this, row, column, rows, columns);
  }

  getDataRange(): FakeRange {
    return new FakeRange(
      this,
      1,
      1,
      Math.max(this.getLastRow(), 1),
      Math.max(this.getLastColumn(), 1)
    );
  }

  setFrozenRows(): void {}
  setRowHeight(): void {}
}

class FakeSpreadsheet {
  private readonly sheets = new Map<string, FakeSheet>();

  getSheetByName(name: string): FakeSheet | null {
    return this.sheets.get(name) ?? null;
  }

  insertSheet(name: string): FakeSheet {
    const sheet = new FakeSheet();
    this.sheets.set(name, sheet);
    return sheet;
  }

  getSpreadsheetTimeZone(): string {
    return 'America/Montreal';
  }
}

function installSpreadsheet(spreadsheet: FakeSpreadsheet): void {
  vi.stubGlobal('SpreadsheetApp', {
    getActiveSpreadsheet: () => spreadsheet,
    BorderStyle: { SOLID: 'SOLID' }
  });
  vi.stubGlobal('Utilities', {
    formatDate: (_date: Date, _timezone: string, _format: string) => '2026-08-28'
  });
}

describe('Google Sheets Signals History repository', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('initializes a fresh sheet with the complete canonical schema before archiving', () => {
    const spreadsheet = new FakeSpreadsheet();
    installSpreadsheet(spreadsheet);
    const repository = new GoogleSheetsSignalHistoryRepository();

    repository.ensureReady([...FINVIZ_MOMENTUM_EXPORT_HEADERS]);
    repository.append([
      {
        signalDate: '2026-08-28',
        detectedAt: new Date('2026-08-28T16:04:00.000Z'),
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyName: 'Momentum Breakout',
        strategyVersion: 'V1',
        ticker: 'BOX',
        attributes: {
          Ticker: 'BOX',
          Company: 'Box Inc',
          Sector: 'Technology',
          'Average Volume': 1_000_000,
          Price: 34.98
        }
      }
    ]);

    const sheet = spreadsheet.getSheetByName('Signals History');
    expect(sheet?.values[0]).toEqual([...SIGNALS_HISTORY_HEADERS]);
    expect(new Set(sheet?.values[0]).size).toBe(SIGNALS_HISTORY_HEADERS.length);
    expect(sheet?.values[1]).toHaveLength(SIGNALS_HISTORY_HEADERS.length);
    expect(sheet?.values[1]?.[SIGNALS_HISTORY_HEADERS.indexOf('Ticker')]).toBe('BOX');
    expect(sheet?.values[1]?.[SIGNALS_HISTORY_HEADERS.indexOf('Finviz Ticker')]).toBe('BOX');
    expect(sheet?.values[1]?.[SIGNALS_HISTORY_HEADERS.indexOf('Company')]).toBe('Box Inc');
    expect(sheet?.values[1]?.[SIGNALS_HISTORY_HEADERS.indexOf('Average Volume')]).toBe(1_000_000);
    expect(sheet?.values[1]?.[SIGNALS_HISTORY_HEADERS.indexOf('Price')]).toBe(34.98);
  });

  it('maps every configured Finviz CSV field to exactly one Signals History destination', () => {
    const destinations = FINVIZ_MOMENTUM_EXPORT_HEADERS.map(signalsHistoryHeaderForFinvizHeader);

    expect(FINVIZ_MOMENTUM_EXPORT_HEADERS).toEqual([
      'No.',
      'Ticker',
      'Company',
      'Sector',
      'Industry',
      'Country',
      'Market Cap',
      'P/E',
      'Volume',
      'Price',
      'Change',
      'Average Volume',
      'Relative Volume',
      'Relative Strength Index (14)',
      '52-Week High',
      '20-Day Simple Moving Average',
      '200-Day Simple Moving Average',
      '50-Day Simple Moving Average',
      'Performance (Week)',
      'Performance (Month)',
      'Earnings Date'
    ]);
    expect(destinations).toEqual([...MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS]);
    expect(destinations).toHaveLength(FINVIZ_MOMENTUM_EXPORT_HEADERS.length);
    expect(new Set(destinations).size).toBe(destinations.length);
    expect(signalsHistoryHeaderForFinvizHeader('Ticker')).toBe('Finviz Ticker');
    expect(signalsHistoryHeaderForFinvizHeader('Average Volume')).toBe('Average Volume');
  });

  it('rejects incomplete historical headers instead of dynamically extending them', () => {
    const spreadsheet = new FakeSpreadsheet();
    const sheet = spreadsheet.insertSheet('Signals History');
    sheet.values = [
      ['Signal Date', 'Detected At', 'Strategy ID', 'Strategy', 'Strategy Version', 'Ticker']
    ];
    installSpreadsheet(spreadsheet);

    expect(() =>
      new GoogleSheetsSignalHistoryRepository().ensureReady([...FINVIZ_MOMENTUM_EXPORT_HEADERS])
    ).toThrow('Signals History utilise un ancien schéma. Colonne absente : No.');
  });

  it('rejects unsupported attributes before rows can exceed canonical headers', () => {
    const spreadsheet = new FakeSpreadsheet();
    installSpreadsheet(spreadsheet);

    expect(() =>
      new GoogleSheetsSignalHistoryRepository().ensureReady([
        ...FINVIZ_MOMENTUM_EXPORT_HEADERS,
        'Unexpected'
      ])
    ).toThrow('Signals History attribut non supporté : Unexpected');
  });
});
