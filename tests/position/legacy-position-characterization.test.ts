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
  findOpenPositionByTradePlanId(sheet: LegacySheet, tradePlanId: unknown): number;
  addPositionFormulas(sheet: LegacySheet, row: number): void;
}

const utilitiesSource = readFileSync(new URL('../../Utils.js', import.meta.url), 'utf8');
const positionSource = readFileSync(new URL('../../Position.js', import.meta.url), 'utf8');
const legacy = new Function(
  `${utilitiesSource}\n${positionSource}; ` +
    'return { findOpenPositionByTradePlanId, addPositionFormulas };'
)() as LegacyFunctions;

function duplicateSheet(rows: unknown[][]): LegacySheet {
  const headers = ['Position ID', 'Trade Plan ID', 'Status'];

  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => headers.length,
    getRange: (row: number) => ({
      getValues: () => (row === 1 ? [headers] : rows),
      setFormula: () => undefined
    })
  };
}

describe('legacy Position duplicate characterization', () => {
  it.each(['OPEN', ' open ', 'open'])(
    'treats %s as open for the same trimmed Trade Plan ID',
    (status) => {
      const sheet = duplicateSheet([['P-1', ' TP-1 ', status]]);

      expect(legacy.findOpenPositionByTradePlanId(sheet, 'TP-1')).toBe(2);
    }
  );

  it.each(['CLOSED', 'STOPPED', 'TARGET HIT', '', 'UNKNOWN'])(
    'does not treat %s as open',
    (status) => {
      const sheet = duplicateSheet([['P-1', 'TP-1', status]]);

      expect(legacy.findOpenPositionByTradePlanId(sheet, 'TP-1')).toBe(-1);
    }
  );

  it('keeps Trade Plan ID comparison case-sensitive', () => {
    const sheet = duplicateSheet([['P-1', 'tp-1', 'OPEN']]);

    expect(legacy.findOpenPositionByTradePlanId(sheet, 'TP-1')).toBe(-1);
  });

  it('returns the first matching physical row', () => {
    const sheet = duplicateSheet([
      ['P-1', 'TP-1', 'CLOSED'],
      ['P-2', 'TP-1', 'OPEN'],
      ['P-3', 'TP-1', 'OPEN']
    ]);

    expect(legacy.findOpenPositionByTradePlanId(sheet, 'TP-1')).toBe(3);
  });

  it('returns -1 for an empty Positions sheet', () => {
    expect(legacy.findOpenPositionByTradePlanId(duplicateSheet([]), 'TP-1')).toBe(-1);
  });
});

describe('legacy Position formula characterization', () => {
  it('writes the three historical formulas to their exact columns', () => {
    const formulas = new Map<number, string>();
    const sheet: LegacySheet = {
      getLastRow: () => 1,
      getLastColumn: () => 25,
      getRange: (_row: number, column = 0) => ({
        getValues: () => [[]],
        setFormula: (formula: string) => {
          formulas.set(column, formula);
        }
      })
    };

    legacy.addPositionFormulas(sheet, 7);

    expect(Object.fromEntries(formulas)).toEqual({
      18: '=IFERROR(GOOGLEFINANCE(G7,"price"),"")',
      19: '=IF(OR(R7="",J7="",L7=""),"",(R7-J7)*L7)',
      20: '=IF(OR(R7="",J7=""),"",R7/J7-1)'
    });
  });
});
