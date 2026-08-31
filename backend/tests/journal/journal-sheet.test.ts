/// <reference types="google-apps-script" />

import { describe, expect, it, vi } from 'vitest';
import { JOURNAL_HEADERS } from '../../src/adapters/outbound/google-sheets/journal/journal-mapper';
import {
  addJournalFormulas,
  ensureJournalAccountColumn,
  formatJournalRow,
  getOrCreateJournalSheet,
  refreshJournalValidations,
  validateJournalSchema
} from '../../src/adapters/outbound/google-sheets/journal/journal-sheet';

function sheetWithHeaders(headers: readonly string[]) {
  const formulas = new Map<number, string>();
  const formats = new Map<string, string>();
  const setValue = vi.fn();
  const getRange = vi.fn((row: number, column: number, rows?: number, columns?: number) => {
    const range = {
      getValues: () => (row === 1 ? [headers] : []),
      setFormula: (formula: string) => formulas.set(column, formula),
      setNumberFormat: (format: string) =>
        formats.set(`${row}:${column}:${rows ?? 1}:${columns ?? 1}`, format),
      setValue: (value: string) => {
        setValue(value);
        return range;
      },
      setFontWeight: vi.fn()
    };
    return range;
  });
  const sheet = {
    getLastColumn: () => headers.length,
    getRange
  } as unknown as GoogleAppsScript.Spreadsheet.Sheet;
  return { sheet, formulas, formats, getRange, setValue };
}

describe('Journal physical sheet contract', () => {
  it('returns an existing sheet without reinitializing or re-theming it', () => {
    const existing = {
      getLastRow: () => 1,
      getLastColumn: () => 1,
      getRange: () => ({ getValues: () => [['existing']] })
    } as unknown as GoogleAppsScript.Spreadsheet.Sheet;
    const insertSheet = vi.fn();
    const themeJournal = vi.fn();
    vi.stubGlobal('themeJournal', themeJournal);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => existing, insertSheet })
    });
    expect(getOrCreateJournalSheet()).toBe(existing);
    expect(insertSheet).not.toHaveBeenCalled();
    expect(themeJournal).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('validates the full row-1 DATA schema including Account ID', () => {
    expect(validateJournalSchema(sheetWithHeaders(JOURNAL_HEADERS).sheet)).toBe(true);
    expect(() =>
      validateJournalSchema(sheetWithHeaders(JOURNAL_HEADERS.slice(0, -1)).sheet)
    ).toThrow('Journal utilise un ancien schéma. Colonne absente : Account ID');
    expect(() => validateJournalSchema(sheetWithHeaders(JOURNAL_HEADERS.slice(1)).sheet)).toThrow(
      'Journal utilise un ancien schéma. Colonne absente : Journal ID'
    );
  });

  it('appends Account ID at AA without rewriting historical rows', () => {
    const { sheet, getRange, setValue } = sheetWithHeaders(JOURNAL_HEADERS.slice(0, -1));
    ensureJournalAccountColumn(sheet);
    expect(getRange).toHaveBeenLastCalledWith(1, 27);
    expect(setValue).toHaveBeenCalledWith('Account ID');
  });

  it('preserves permissive Exit Reason and Followed Plan validations', () => {
    const builders: Array<{
      requireValueInList: ReturnType<typeof vi.fn>;
      setAllowInvalid: ReturnType<typeof vi.fn>;
      build: ReturnType<typeof vi.fn>;
    }> = [];
    vi.stubGlobal('SpreadsheetApp', {
      newDataValidation: () => {
        const builder = {
          requireValueInList: vi.fn().mockReturnThis(),
          setAllowInvalid: vi.fn().mockReturnThis(),
          build: vi.fn(() => `RULE-${builders.length + 1}`)
        };
        builders.push(builder);
        return builder;
      }
    });
    const validations = new Map<number, unknown>();
    const headers = JOURNAL_HEADERS;
    const sheet = {
      getLastColumn: () => headers.length,
      getMaxRows: () => 500,
      getRange: vi.fn((row: number, column: number) => ({
        getValues: () => (row === 1 ? [headers] : []),
        setDataValidation: (rule: unknown) => validations.set(column, rule)
      }))
    } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

    refreshJournalValidations(sheet);

    expect(builders[0].requireValueInList).toHaveBeenCalledWith(
      ['TARGET', 'STOP', 'TRAILING STOP', 'MANUAL', 'SETUP INVALIDATED', 'TIME EXIT', 'OTHER'],
      true
    );
    expect(builders[1].requireValueInList).toHaveBeenCalledWith(['YES', 'PARTIALLY', 'NO'], true);
    expect(builders[0].setAllowInvalid).toHaveBeenCalledWith(true);
    expect(builders[1].setAllowInvalid).toHaveBeenCalledWith(true);
    expect(sheet.getRange).toHaveBeenCalledWith(2, 23, 499, 1);
    expect(sheet.getRange).toHaveBeenCalledWith(2, 26, 499, 1);
    expect(validations).toEqual(
      new Map([
        [23, 'RULE-2'],
        [26, 'RULE-3']
      ])
    );
    vi.unstubAllGlobals();
  });

  it('writes exact formulas and formats without touching Account ID', () => {
    const { sheet, formulas, formats } = sheetWithHeaders(JOURNAL_HEADERS);
    addJournalFormulas(sheet, 7);
    formatJournalRow(sheet, 7);
    expect(Object.fromEntries(formulas)).toEqual({
      20: '=IF(OR(L7="",M7=""),"",M7/L7-1)',
      21: '=IF(OR(Q7="",Q7<=0,S7=""),"",S7/Q7)',
      22: '=IF(S7="","",IF(S7>0,"WIN",IF(S7<0,"LOSS","BREAKEVEN")))'
    });
    expect(formats).toEqual(
      new Map([
        ['7:9:1:2', 'yyyy-mm-dd hh:mm:ss'],
        ['7:11:1:3', '$0.00'],
        ['7:14:1:1', '0'],
        ['7:15:1:2', '$0.00'],
        ['7:17:1:1', '$0.00'],
        ['7:18:1:1', '0.00'],
        ['7:19:1:1', '$0.00'],
        ['7:20:1:1', '0.00%'],
        ['7:21:1:1', '0.00']
      ])
    );
  });
});
