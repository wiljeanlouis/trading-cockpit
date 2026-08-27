import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface LegacySheet {
  getLastRow(): number;
  getLastColumn(): number;
  getRange(...coordinates: number[]): {
    getValues(): unknown[][];
    setFormula(formula: string): void;
  };
}

interface LegacyFunctions {
  findActiveTradePlanByWatchlistId(sheet: LegacySheet, watchlistId: unknown): number;
  addTradePlanFormulas(sheet: LegacySheet, row: number): void;
}

const utilitiesSource = readFileSync(new URL('../../Utils.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../TradePlan.js', import.meta.url), 'utf8');
const legacy = new Function(
  `${utilitiesSource}\n${source}; ` +
    'return { findActiveTradePlanByWatchlistId, addTradePlanFormulas };'
)() as LegacyFunctions;

function duplicateSheet(rows: unknown[][]): LegacySheet {
  const headers = ['Trade Plan ID', 'Watchlist ID', 'Status'];

  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => headers.length,
    getRange: (row: number) => ({
      getValues: () => (row === 1 ? [headers] : rows),
      setFormula: () => undefined
    })
  };
}

describe('legacy Trade Plan duplicate characterization', () => {
  it.each(['DRAFT', 'READY', ' draft ', 'ready'])(
    'treats %s as active for the same trimmed Watchlist ID',
    (status) => {
      const sheet = duplicateSheet([['TP-1', ' WL-1 ', status]]);

      expect(legacy.findActiveTradePlanByWatchlistId(sheet, 'WL-1')).toBe(2);
    }
  );

  it.each(['EXECUTED', 'CANCELLED', '', 'WATCHING', 'UNKNOWN'])(
    'does not treat %s as active',
    (status) => {
      const sheet = duplicateSheet([['TP-1', 'WL-1', status]]);

      expect(legacy.findActiveTradePlanByWatchlistId(sheet, 'WL-1')).toBe(-1);
    }
  );

  it('keeps Watchlist ID comparison case-sensitive', () => {
    const sheet = duplicateSheet([['TP-1', 'wl-1', 'DRAFT']]);

    expect(legacy.findActiveTradePlanByWatchlistId(sheet, 'WL-1')).toBe(-1);
  });

  it('returns the first matching physical row', () => {
    const sheet = duplicateSheet([
      ['TP-1', 'WL-1', 'CANCELLED'],
      ['TP-2', 'WL-1', 'READY'],
      ['TP-3', 'WL-1', 'DRAFT']
    ]);

    expect(legacy.findActiveTradePlanByWatchlistId(sheet, 'WL-1')).toBe(3);
  });

  it('returns -1 for an empty Trade Plans sheet', () => {
    expect(legacy.findActiveTradePlanByWatchlistId(duplicateSheet([]), 'WL-1')).toBe(-1);
  });
});

describe('legacy Trade Plan formula characterization', () => {
  it('writes the six historical formulas to their exact columns', () => {
    const formulas = new Map<number, string>();
    const sheet: LegacySheet = {
      getLastRow: () => 1,
      getLastColumn: () => 29,
      getRange: (_row: number, column = 0) => ({
        getValues: () => [[]],
        setFormula: (formula: string) => {
          formulas.set(column, formula);
        }
      })
    };

    legacy.addTradePlanFormulas(sheet, 7);

    expect(Object.fromEntries(formulas)).toEqual({
      20: '=IF(OR(Q7="",R7=""),"",Q7-R7)',
      21: '=IF(OR(Q7="",S7=""),"",S7-Q7)',
      22: '=IF(OR(T7="",T7<=0,U7=""),"",U7/T7)',
      25: '=IF(OR(W7="",X7=""),"",W7*X7)',
      26: '=IF(OR(Y7="",T7="",T7<=0),"",FLOOR(Y7/T7,1))',
      27: '=IF(OR(Z7="",Q7=""),"",Z7*Q7)'
    });
  });
});
