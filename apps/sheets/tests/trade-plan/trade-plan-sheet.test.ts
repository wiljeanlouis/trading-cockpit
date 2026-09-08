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

  it('writes all exact formulas and formats with Account ID in the final canonical column', () => {
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
      19: '=IF(OR(P7="",Q7=""),"",P7-Q7)',
      20: '=IF(OR(P7="",R7=""),"",R7-P7)',
      21: '=IF(OR(S7="",S7<=0,T7=""),"",T7/S7)',
      24: '=IF(OR(V7="",W7=""),"",V7*W7)',
      25: '=IF(OR(X7="",S7="",S7<=0),"",FLOOR(X7/S7,1))',
      26: '=IF(OR(Y7="",P7=""),"",Y7*P7)'
    });
    expect(formats).toEqual([
      [[7, 6], 'yyyy-mm-dd'],
      [[7, 7], '$0.00'],
      [[7, 9], '$0.00'],
      [[7, 11, 1, 2], '$0.00'],
      [[7, 14], 'yyyy-mm-dd hh:mm:ss'],
      [[7, 16, 1, 3], '$0.00'],
      [[7, 19, 1, 2], '$0.00'],
      [[7, 21], '0.00'],
      [[7, 22], '$#,##0.00'],
      [[7, 23], '0.00%'],
      [[7, 24], '$0.00'],
      [[7, 25], '0'],
      [[7, 26], '$#,##0.00']
    ]);
  });

  it('preserves validation lists and disallows invalid values', () => {
    const headers = Array.from({ length: 29 }, (_, index) => `C${index}`);
    headers[15] = 'Entry Type';
    headers[26] = 'Status';
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
      { list: ['TRIGGER', 'RETEST', 'LIMIT'], allow: false },
      { list: ['DRAFT', 'READY', 'EXECUTED', 'CANCELLED'], allow: false }
    ]);
    expect(ranges).toEqual([
      [2, 16, 49, 1],
      [2, 27, 49, 1]
    ]);
    vi.unstubAllGlobals();
  });
});
