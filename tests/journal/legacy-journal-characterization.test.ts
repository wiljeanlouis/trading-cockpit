import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface LegacySheet {
  getLastRow(): number;
  getLastColumn(): number;
  getRange(
    row: number,
    column?: number
  ): {
    getValues(): unknown[][];
    setFormula(formula: string): void;
  };
}

interface LegacyJournalFunctions {
  addJournalFormulas(sheet: LegacySheet, row: number): void;
  findJournalRowByPositionId(sheet: LegacySheet, positionId: unknown): number;
}

const utilitiesSource = readFileSync(new URL('../../Utils.js', import.meta.url), 'utf8');
const journalSource = readFileSync(new URL('../../Journal.js', import.meta.url), 'utf8');
const legacy = new Function(
  `${utilitiesSource}\n${journalSource}; ` +
    'return { addJournalFormulas, findJournalRowByPositionId };'
)() as LegacyJournalFunctions;

describe('legacy Journal formula characterization', () => {
  it('writes the three historical formulas to their exact columns', () => {
    const formulas = new Map<number, string>();
    const sheet: LegacySheet = {
      getLastRow: () => 1,
      getLastColumn: () => 26,
      getRange: (_row, column = 0) => ({
        getValues: () => [[]],
        setFormula: (formula) => formulas.set(column, formula)
      })
    };

    legacy.addJournalFormulas(sheet, 7);

    expect(Object.fromEntries(formulas)).toEqual({
      20: '=IF(OR(L7="",M7=""),"",M7/L7-1)',
      21: '=IF(OR(Q7="",Q7<=0,S7=""),"",S7/Q7)',
      22: '=IF(S7="","",IF(S7>0,"WIN",IF(S7<0,"LOSS","BREAKEVEN")))'
    });
  });
});

describe('legacy Journal duplicate characterization', () => {
  function sheetWithPositionIds(ids: unknown[]): LegacySheet {
    const headers = ['Journal ID', 'Position ID'];
    const rows = ids.map((id, index) => [`J-${index + 1}`, id]);

    return {
      getLastRow: () => rows.length + 1,
      getLastColumn: () => headers.length,
      getRange: (row) => ({
        getValues: () => (row === 1 ? [headers] : rows),
        setFormula: () => undefined
      })
    };
  }

  it('trims IDs and returns the first matching physical row', () => {
    expect(legacy.findJournalRowByPositionId(sheetWithPositionIds([' P-1 ', 'P-1']), 'P-1')).toBe(
      2
    );
  });

  it('keeps Position ID comparison case-sensitive', () => {
    expect(legacy.findJournalRowByPositionId(sheetWithPositionIds(['p-1']), 'P-1')).toBe(-1);
  });

  it('returns -1 for an empty Journal', () => {
    expect(legacy.findJournalRowByPositionId(sheetWithPositionIds([]), 'P-1')).toBe(-1);
  });
});
