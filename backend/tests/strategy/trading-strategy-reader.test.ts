import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GoogleSheetsTradingStrategyReader,
  mapTradingStrategyRow,
  type SheetTradingStrategy
} from '../../src/adapters/outbound/google-sheets/trading-strategy/google-sheets-trading-strategy-reader';
import { validateEnabledStrategies } from '../../src/adapters/inbound/google-sheets/ui/setup-strategies';

afterEach(() => vi.unstubAllGlobals());

const headers = [
  'Strategy ID',
  'Name',
  'Version',
  'Type',
  'Enabled',
  'Risk %',
  'Max Positions',
  'Description'
];

describe('trading strategy row characterization', () => {
  it('preserves trimming, strict enabled, and numeric coercions', () => {
    expect(
      mapTradingStrategyRow(headers, [
        ' ID ',
        ' Name ',
        ' V1 ',
        ' MOMENTUM ',
        true,
        '0.005',
        '5',
        ' Description '
      ])
    ).toEqual({
      id: 'ID',
      name: 'Name',
      version: 'V1',
      type: 'MOMENTUM',
      enabled: true,
      riskPercent: 0.005,
      maxPositions: 5,
      description: 'Description'
    });
    expect(mapTradingStrategyRow(headers, ['', '', '', '', 'TRUE', 'bad', '', '']).enabled).toBe(
      false
    );
    expect(mapTradingStrategyRow(headers, ['', '', '', '', false, 'bad', '', ''])).toMatchObject({
      riskPercent: 0,
      maxPositions: 0
    });
  });

  it('preserves the shared missing-column error', () => {
    expect(() => mapTradingStrategyRow(headers.slice(0, -1), [])).toThrow(
      'Colonne absente : Description'
    );
  });

  it('looks up IDs case-insensitively and returns the first matching row', () => {
    const rows = [
      ['ABC', 'First', 'V1', 'MOMENTUM', true, 0.01, 1, ''],
      ['abc', 'Second', 'V2', 'MOMENTUM', true, 0.01, 1, '']
    ];
    const sheet = {
      getLastRow: () => 3,
      getLastColumn: () => headers.length,
      getRange: (_row: number, _column: number, numberOfRows: number) => ({
        getValues: () => (numberOfRows > 1 ? [headers, ...rows] : [headers])
      })
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });
    expect(new GoogleSheetsTradingStrategyReader().getById(' abc ').name).toBe('First');
  });

  it('reads Strategy headers and rows once when listing all strategies', () => {
    const rows = [
      ['ABC', 'First', 'V1', 'MOMENTUM', true, 0.01, 1, ''],
      ['DEF', 'Second', 'V1', 'MOMENTUM', false, 0.01, 1, '']
    ];
    const sheet = {
      getLastRow: () => 3,
      getLastColumn: () => headers.length,
      getRange: vi.fn((row: number, _column: number, numberOfRows: number) => ({
        getValues: () => (row === 1 && numberOfRows > 1 ? [headers, ...rows] : [headers])
      }))
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });

    expect(new GoogleSheetsTradingStrategyReader().listAll().map((item) => item.id)).toEqual([
      'ABC',
      'DEF'
    ]);
    expect(sheet.getRange).toHaveBeenCalledTimes(1);
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 3, headers.length);
  });

  it('preserves the absent registry error', () => {
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => null })
    });
    expect(() => new GoogleSheetsTradingStrategyReader().getById('X')).toThrow(
      'Aucune stratégie configurée.'
    );
  });
});

function strategy(overrides: Partial<SheetTradingStrategy> = {}): SheetTradingStrategy {
  return {
    id: 'MOMENTUM_BREAKOUT',
    name: 'Momentum Breakout',
    version: 'V1',
    type: 'MOMENTUM',
    enabled: true,
    riskPercent: 0.005,
    maxPositions: 5,
    description: '',
    ...overrides
  };
}

describe('strategy validation characterization', () => {
  it('requires at least one enabled strategy', () => {
    expect(() => validateEnabledStrategies([])).toThrow('Au moins une stratégie doit être active.');
  });

  it('preserves case-sensitive duplicate validation', () => {
    expect(validateEnabledStrategies([strategy({ id: 'ABC' }), strategy({ id: 'abc' })])).toBe(
      true
    );
    expect(() =>
      validateEnabledStrategies([strategy({ id: 'ABC' }), strategy({ id: 'ABC' })])
    ).toThrow('Strategy ID dupliqué : ABC');
  });

  it('preserves ID, risk, and max-position boundaries', () => {
    expect(() => validateEnabledStrategies([strategy({ id: '' })])).toThrow(
      'Strategy ID obligatoire.'
    );
    expect(() => validateEnabledStrategies([strategy({ riskPercent: 0 })])).toThrow(
      'Risk % invalide pour MOMENTUM_BREAKOUT'
    );
    expect(validateEnabledStrategies([strategy({ riskPercent: 0.05 })])).toBe(true);
    expect(() => validateEnabledStrategies([strategy({ riskPercent: 0.050001 })])).toThrow(
      'Risk % invalide pour MOMENTUM_BREAKOUT'
    );
    expect(() => validateEnabledStrategies([strategy({ maxPositions: 0 })])).toThrow(
      'Max Positions invalide pour MOMENTUM_BREAKOUT'
    );
    expect(validateEnabledStrategies([strategy({ maxPositions: 1.5 })])).toBe(true);
  });
});
