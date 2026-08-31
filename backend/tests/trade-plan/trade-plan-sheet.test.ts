/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addTradePlanFormulas,
  formatTradePlanRow,
  getOrCreateTradePlansSheet,
  refreshTradePlanValidations,
  validateTradePlansSchema
} from '../../src/adapters/outbound/google-sheets/trade-plan/trade-plan-sheet';
import { TRADE_PLAN_HEADERS } from '../../src/adapters/outbound/google-sheets/trade-plan/trade-plan-mapper';

afterEach(() => vi.unstubAllGlobals());

describe('Trade Plan physical sheet contract', () => {
  it('returns an existing sheet without rebuilding it', () => {
    const sheet = {
      getLastRow: () => 1,
      getLastColumn: () => 1,
      getRange: vi.fn(() => ({ getValues: () => [['existing']] }))
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });
    expect(getOrCreateTradePlansSheet()).toBe(sheet);
    expect(sheet.getRange).not.toHaveBeenCalled();
  });

  it('validates the full row-1 DATA schema including Account ID', () => {
    const headers = [...TRADE_PLAN_HEADERS];
    const sheet = {
      getLastColumn: () => headers.length,
      getRange: () => ({ getValues: () => [headers] })
    };
    expect(validateTradePlansSchema(sheet as never)).toBe(true);
    headers.splice(headers.indexOf('Account ID'), 1);
    expect(() => validateTradePlansSchema(sheet as never)).toThrow(
      'Trade Plans utilise un ancien schéma. Colonne absente : Account ID'
    );
    headers.push('Account ID');
    headers.splice(5, 1);
    expect(() => validateTradePlansSchema(sheet as never)).toThrow(
      'Trade Plans utilise un ancien schéma. Colonne absente : Signal Date'
    );
  });

  it('writes all exact formulas and formats without touching AD', () => {
    const formulas = new Map<number, string>();
    const formats: Array<[number[], string]> = [];
    const sheet = {
      getRange: (...coordinates: number[]) => ({
        setFormula: (formula: string) => formulas.set(coordinates[1], formula),
        setNumberFormat: (format: string) => formats.push([coordinates, format])
      })
    };
    addTradePlanFormulas(sheet as never, 7);
    formatTradePlanRow(sheet as never, 7);
    expect(Object.fromEntries(formulas)).toEqual({
      20: '=IF(OR(Q7="",R7=""),"",Q7-R7)',
      21: '=IF(OR(Q7="",S7=""),"",S7-Q7)',
      22: '=IF(OR(T7="",T7<=0,U7=""),"",U7/T7)',
      25: '=IF(OR(W7="",X7=""),"",W7*X7)',
      26: '=IF(OR(Y7="",T7="",T7<=0),"",FLOOR(Y7/T7,1))',
      27: '=IF(OR(Z7="",Q7=""),"",Z7*Q7)'
    });
    expect(formats).toEqual([
      [[7, 6], 'yyyy-mm-dd'],
      [[7, 7], '$0.00'],
      [[7, 9], '$0.00'],
      [[7, 12, 1, 2], '$0.00'],
      [[7, 15], 'yyyy-mm-dd hh:mm:ss'],
      [[7, 17, 1, 3], '$0.00'],
      [[7, 20, 1, 2], '$0.00'],
      [[7, 22], '0.00'],
      [[7, 23], '$#,##0.00'],
      [[7, 24], '0.00%'],
      [[7, 25], '$0.00'],
      [[7, 26], '0'],
      [[7, 27], '$#,##0.00']
    ]);
  });

  it('preserves validation lists and disallows invalid values', () => {
    const headers = Array.from({ length: 28 }, (_, index) => `C${index}`);
    headers[15] = 'Entry Type';
    headers[27] = 'Status';
    const ranges: number[][] = [];
    const states: Array<{ list?: string[]; allow?: boolean }> = [];
    const sheet = {
      getLastColumn: () => 28,
      getMaxRows: () => 50,
      getRange: (...coordinates: number[]) =>
        coordinates[0] === 1
          ? { getValues: () => [headers] }
          : { setDataValidation: () => ranges.push(coordinates) }
    };
    vi.stubGlobal('SpreadsheetApp', {
      newDataValidation: () => {
        const state: { list?: string[]; allow?: boolean } = {};
        states.push(state);
        const builder = {
          requireValueInList: (list: string[]) => {
            state.list = list;
            return builder;
          },
          setAllowInvalid: (allow: boolean) => {
            state.allow = allow;
            return builder;
          },
          build: () => state
        };
        return builder;
      }
    });
    refreshTradePlanValidations(sheet as never);
    expect(states).toEqual([
      { list: ['BREAKOUT', 'RETEST', 'LIMIT'], allow: false },
      { list: ['DRAFT', 'READY', 'EXECUTED', 'CANCELLED'], allow: false }
    ]);
    expect(ranges).toEqual([
      [2, 16, 49, 1],
      [2, 28, 49, 1]
    ]);
    vi.unstubAllGlobals();
  });
});
