/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initializeTradingCockpitWorkbook,
  validateTradingCockpitWorkbook
} from '../../src/adapters/inbound/google-sheets/ui/trading-cockpit-workbook';
import {
  MOMENTUM_SCORE_CONFIG_HEADERS,
  MOMENTUM_SCORE_CONFIG_VALUES
} from '../../src/adapters/inbound/google-sheets/ui/setup-momentum-ranking';
import { SIGNALS_HISTORY_HEADERS } from '@trading-cockpit/contracts';
import { MOMENTUM_RANKING_HEADERS } from '../../src/adapters/outbound/google-sheets/momentum/momentum-ranking-schema';
import { TRADE_PLAN_HEADERS } from '../../src/adapters/outbound/google-sheets/trade-plan/trade-plan-mapper';

class FakeRange {
  constructor(
    private readonly sheet: FakeSheet,
    private readonly row: number | string,
    private readonly column = 1,
    private readonly rows = 1,
    private readonly columns = 1
  ) {}

  getValues(): unknown[][] {
    if (typeof this.row === 'string') return [[]];
    const startRow = this.row;
    return Array.from({ length: this.rows }, (_unusedRow, rowOffset) =>
      Array.from(
        { length: this.columns },
        (_unusedColumn, columnOffset) =>
          this.sheet.values[startRow - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ''
      )
    );
  }

  setValues(values: unknown[][]): FakeRange {
    this.sheet.recordWrite();
    if (typeof this.row === 'string') return this;
    const startRow = this.row;
    values.forEach((sourceRow, rowOffset) => {
      const targetRow = startRow - 1 + rowOffset;
      this.sheet.values[targetRow] = this.sheet.values[targetRow] ?? [];
      sourceRow.forEach((value, columnOffset) => {
        this.sheet.values[targetRow][this.column - 1 + columnOffset] = value;
      });
    });
    return this;
  }

  setFontWeight(): FakeRange {
    return this;
  }
  setFontSize(): FakeRange {
    return this;
  }
  setFontColor(): FakeRange {
    return this;
  }
  setBackground(): FakeRange {
    return this;
  }
  setBorder(): FakeRange {
    return this;
  }
  setNumberFormat(): FakeRange {
    return this;
  }
  setDataValidation(): FakeRange {
    return this;
  }
  clearDataValidations(): FakeRange {
    return this;
  }
  merge(): FakeRange {
    return this;
  }
  insertCheckboxes(): FakeRange {
    return this;
  }
}

class FakeSheet {
  values: unknown[][];
  writeCount = 0;

  constructor(
    readonly name: string,
    values: unknown[][] = []
  ) {
    this.values = values.map((row) => [...row]);
  }

  recordWrite(): void {
    this.writeCount += 1;
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

  getMaxRows(): number {
    return 1000;
  }

  getMaxColumns(): number {
    return 40;
  }

  getRange(row: number | string, column?: number, rows?: number, columns?: number): FakeRange {
    return new FakeRange(this, row, column, rows, columns);
  }

  clear(): void {
    this.recordWrite();
    this.values = [];
  }

  setFrozenRows(): void {}
  autoResizeColumns(): void {}
  setColumnWidth(): void {}
  setRowHeight(): void {}
  setConditionalFormatRules(): void {}
}

class FakeSpreadsheet {
  readonly sheets = new Map<string, FakeSheet>();
  readonly toast = vi.fn();

  constructor(initialSheets: FakeSheet[] = []) {
    initialSheets.forEach((sheet) => this.sheets.set(sheet.name, sheet));
  }

  getSheetByName(name: string): FakeSheet | null {
    return this.sheets.get(name) ?? null;
  }

  insertSheet(name: string): FakeSheet {
    const sheet = new FakeSheet(name);
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
    newDataValidation: () => {
      const builder = {
        requireValueInList: vi.fn(() => builder),
        requireNumberBetween: vi.fn(() => builder),
        setAllowInvalid: vi.fn(() => builder),
        setHelpText: vi.fn(() => builder),
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
}

afterEach(() => vi.unstubAllGlobals());

describe('Trading Cockpit workbook setup and validation', () => {
  it('initializes a clean workbook and validates it as canonical', () => {
    const spreadsheet = new FakeSpreadsheet();
    installSpreadsheet(spreadsheet);

    const initialization = initializeTradingCockpitWorkbook();
    const validation = validateTradingCockpitWorkbook();

    expect(initialization.overallStatus).toBe('VALID');
    expect(validation.overallStatus).toBe('VALID');
    expect(spreadsheet.getSheetByName('Momentum Ranking')?.values[0]).toEqual([
      ...MOMENTUM_RANKING_HEADERS
    ]);
    expect(spreadsheet.getSheetByName('Trade Plans')?.values[0]).toEqual([...TRADE_PLAN_HEADERS]);
    expect(spreadsheet.getSheetByName('Signals History')?.values[0]).toEqual([
      ...SIGNALS_HISTORY_HEADERS
    ]);
    expect(new Set(SIGNALS_HISTORY_HEADERS).size).toBe(SIGNALS_HISTORY_HEADERS.length);
    expect(SIGNALS_HISTORY_HEADERS).toContain('Finviz Ticker');
    expect(spreadsheet.getSheetByName('Signals History')?.values[1]).toBeUndefined();
    expect(spreadsheet.getSheetByName('Momentum Ranking')?.values[1]).toBeUndefined();
    expect(spreadsheet.getSheetByName('Accounts')?.values).toEqual([
      ['Account ID', 'Name', 'Base Currency', 'Risk % Per Trade']
    ]);
    expect(spreadsheet.getSheetByName('Momentum Score Config')?.values[0]).toEqual([
      ...MOMENTUM_SCORE_CONFIG_HEADERS
    ]);
    expect(spreadsheet.getSheetByName('Momentum Score Config')?.values[1]).toEqual(
      MOMENTUM_SCORE_CONFIG_VALUES[0]
    );
    expect(spreadsheet.getSheetByName('Momentum Score Config')?.values).not.toContainEqual([
      '',
      '',
      '',
      ''
    ]);
    expect(initialization.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: 'Accounts', status: 'MANUAL_CONFIGURATION' }),
        expect.objectContaining({ sheetName: 'Dashboard', status: 'SKIPPED_OPTIONAL' }),
        expect.objectContaining({ sheetName: 'Lists', classification: 'LEGACY_UNUSED' })
      ])
    );
  });

  it('preserves canonical existing data and stays idempotent on a second run', () => {
    const canonicalTradePlans = new FakeSheet('Trade Plans', [
      [...TRADE_PLAN_HEADERS],
      ['TP-1', 'WL-1']
    ]);
    const spreadsheet = new FakeSpreadsheet([canonicalTradePlans]);
    installSpreadsheet(spreadsheet);

    initializeTradingCockpitWorkbook();
    const writesAfterFirstRun = canonicalTradePlans.writeCount;
    const scoreConfigWritesAfterFirstRun =
      spreadsheet.getSheetByName('Momentum Score Config')?.writeCount;
    const secondRun = initializeTradingCockpitWorkbook();

    expect(canonicalTradePlans.values[1]).toEqual(['TP-1', 'WL-1']);
    expect(canonicalTradePlans.writeCount).toBe(writesAfterFirstRun);
    expect(spreadsheet.getSheetByName('Momentum Score Config')?.writeCount).toBe(
      scoreConfigWritesAfterFirstRun
    );
    expect(secondRun.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: 'Trade Plans', status: 'ALREADY_VALID' })
      ])
    );
  });

  it('initializes an existing empty sheet', () => {
    const emptyWatchlist = new FakeSheet('Watchlist', [['', '', '']]);
    const spreadsheet = new FakeSpreadsheet([emptyWatchlist]);
    installSpreadsheet(spreadsheet);

    const report = initializeTradingCockpitWorkbook();

    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: 'Watchlist', status: 'INITIALIZED' })
      ])
    );
    expect(emptyWatchlist.values[0]?.[0]).toBe('Watchlist ID');
  });

  it('fails safely for a non-empty incompatible sheet', () => {
    const malformedTradePlans = new FakeSheet('Trade Plans', [
      ['TRADING PLAN TITLE'],
      [...TRADE_PLAN_HEADERS]
    ]);
    const spreadsheet = new FakeSpreadsheet([malformedTradePlans]);
    installSpreadsheet(spreadsheet);

    const report = initializeTradingCockpitWorkbook();

    expect(report.overallStatus).toBe('INVALID');
    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: 'Trade Plans', status: 'SCHEMA_MISMATCH' })
      ])
    );
    expect(malformedTradePlans.values[0]).toEqual(['TRADING PLAN TITLE']);
  });

  it('rejects Signals History when canonical signal attribute headers are missing', () => {
    const signalsHistory = new FakeSheet('Signals History', [
      ['Signal Date', 'Detected At', 'Strategy ID', 'Strategy', 'Strategy Version', 'Ticker']
    ]);
    const tradePlans = new FakeSheet('Trade Plans', [[...TRADE_PLAN_HEADERS, 'Unexpected']]);
    const spreadsheet = new FakeSpreadsheet([signalsHistory, tradePlans]);
    installSpreadsheet(spreadsheet);

    const report = validateTradingCockpitWorkbook();

    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: 'Signals History', status: 'SCHEMA_MISMATCH' }),
        expect.objectContaining({ sheetName: 'Trade Plans', status: 'SCHEMA_MISMATCH' })
      ])
    );
  });

  it('treats the historical Momentum Ranking row-5 layout as invalid', () => {
    const legacyMomentum = new FakeSheet('Momentum Ranking', [
      ['MOMENTUM BREAKOUT RANKING V1'],
      ['Signal Date: 2026-08-27'],
      ['Score de priorisation seulement — pas un signal d’achat.'],
      [],
      [...MOMENTUM_RANKING_HEADERS]
    ]);
    const spreadsheet = new FakeSpreadsheet([legacyMomentum]);
    installSpreadsheet(spreadsheet);

    const report = validateTradingCockpitWorkbook();

    expect(report.overallStatus).toBe('INVALID');
    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: 'Momentum Ranking', status: 'SCHEMA_MISMATCH' })
      ])
    );
  });

  it('treats the historical Momentum Score Config row-3 header layout as invalid', () => {
    const legacyScoreConfig = new FakeSheet('Momentum Score Config', [
      ['MOMENTUM BREAKOUT SCORE V1', '', '', ''],
      ['', '', '', ''],
      [...MOMENTUM_SCORE_CONFIG_HEADERS],
      ...MOMENTUM_SCORE_CONFIG_VALUES
    ]);
    const spreadsheet = new FakeSpreadsheet([legacyScoreConfig]);
    installSpreadsheet(spreadsheet);

    const report = validateTradingCockpitWorkbook();

    expect(report.overallStatus).toBe('INVALID');
    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheetName: 'Momentum Score Config', status: 'SCHEMA_MISMATCH' })
      ])
    );
  });

  it('validation performs no writes', () => {
    const spreadsheet = new FakeSpreadsheet();
    installSpreadsheet(spreadsheet);
    initializeTradingCockpitWorkbook();
    const writeCounts = new Map(
      [...spreadsheet.sheets.entries()].map(([name, sheet]) => [name, sheet.writeCount])
    );

    validateTradingCockpitWorkbook();

    expect(
      new Map([...spreadsheet.sheets.entries()].map(([name, sheet]) => [name, sheet.writeCount]))
    ).toEqual(writeCounts);
  });
});
