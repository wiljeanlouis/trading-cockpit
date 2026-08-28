/// <reference types="google-apps-script" />

import { describe, expect, it, vi } from 'vitest';
import { POSITION_HEADERS } from '../../src/adapters/outbound/google-sheets/position/position-mapper';
import {
  addPositionFormulas,
  ensurePositionAccountColumn,
  formatPositionRow,
  getOrCreatePositionsSheet,
  refreshPositionValidations,
  validatePositionsSchema
} from '../../src/adapters/outbound/google-sheets/position/position-sheet';

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

describe('Position physical sheet contract', () => {
  it('returns an existing sheet without reinitializing or re-theming it', () => {
    const existing = {} as GoogleAppsScript.Spreadsheet.Sheet;
    const insertSheet = vi.fn();
    const themePositions = vi.fn();
    vi.stubGlobal('themePositions', themePositions);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => existing, insertSheet })
    });
    expect(getOrCreatePositionsSheet()).toBe(existing);
    expect(insertSheet).not.toHaveBeenCalled();
    expect(themePositions).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('validates the historical A-Y schema without requiring appended Account ID', () => {
    const historicalHeaders = POSITION_HEADERS.slice(0, -1);
    expect(validatePositionsSchema(sheetWithHeaders(historicalHeaders).sheet)).toBe(true);
    expect(() =>
      validatePositionsSchema(sheetWithHeaders(historicalHeaders.slice(1)).sheet)
    ).toThrow('Positions utilise un ancien schéma. Colonne absente : Position ID');
  });

  it('appends Account ID at Z and preserves historical row values', () => {
    const historicalHeaders = POSITION_HEADERS.slice(0, -1);
    const { sheet, getRange, setValue } = sheetWithHeaders(historicalHeaders);
    ensurePositionAccountColumn(sheet);
    expect(getRange).toHaveBeenLastCalledWith(1, 26);
    expect(setValue).toHaveBeenCalledWith('Account ID');
  });

  it('does not append an existing exact Account ID header', () => {
    const { sheet, setValue } = sheetWithHeaders(POSITION_HEADERS);
    ensurePositionAccountColumn(sheet);
    expect(setValue).not.toHaveBeenCalled();
  });

  it('preserves the strict Status validation and its full-column range', () => {
    const requireValueInList = vi.fn().mockReturnThis();
    const setAllowInvalid = vi.fn().mockReturnThis();
    const build = vi.fn(() => 'POSITION_RULE');
    vi.stubGlobal('SpreadsheetApp', {
      newDataValidation: () => ({ requireValueInList, setAllowInvalid, build })
    });
    const setDataValidation = vi.fn();
    const headers = POSITION_HEADERS.slice(0, -1);
    const sheet = {
      getLastColumn: () => headers.length,
      getMaxRows: () => 1000,
      getRange: vi.fn((row: number) => ({
        getValues: () => (row === 1 ? [headers] : []),
        setDataValidation
      }))
    } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

    refreshPositionValidations(sheet);

    expect(requireValueInList).toHaveBeenCalledWith(
      ['OPEN', 'CLOSED', 'STOPPED', 'TARGET HIT'],
      true
    );
    expect(setAllowInvalid).toHaveBeenCalledWith(false);
    expect(sheet.getRange).toHaveBeenLastCalledWith(2, 21, 999, 1);
    expect(setDataValidation).toHaveBeenCalledWith('POSITION_RULE');
    vi.unstubAllGlobals();
  });

  it('writes exact formulas and formats without touching Account ID', () => {
    const { sheet, formulas, formats } = sheetWithHeaders(POSITION_HEADERS);
    addPositionFormulas(sheet, 7);
    formatPositionRow(sheet, 7);
    expect(Object.fromEntries(formulas)).toEqual({
      18: '=IFERROR(GOOGLEFINANCE(G7,"price"),"")',
      19: '=IF(OR(R7="",J7="",L7=""),"",(R7-J7)*L7)',
      20: '=IF(OR(R7="",J7=""),"",R7/J7-1)'
    });
    expect(formats).toEqual(
      new Map([
        ['7:8:1:1', 'yyyy-mm-dd hh:mm:ss'],
        ['7:9:1:2', '$0.00'],
        ['7:11:1:2', '0'],
        ['7:13:1:3', '$0.00'],
        ['7:16:1:1', '$0.00'],
        ['7:17:1:1', '0.00'],
        ['7:18:1:1', '$0.00'],
        ['7:19:1:1', '$0.00'],
        ['7:20:1:1', '0.00%'],
        ['7:22:1:1', 'yyyy-mm-dd hh:mm:ss'],
        ['7:23:1:1', '$0.00'],
        ['7:24:1:1', '$0.00']
      ])
    );
  });
});
