import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsTradingStrategyReader } from '../../src/adapters/outbound/google-sheets/trading-strategy/google-sheets-trading-strategy-reader';
import {
  mapTradingStrategyRow,
  mapTradingStrategyVersionRow,
  type SheetTradingStrategy
} from '../../src/adapters/outbound/google-sheets/trading-strategy/trading-strategy-mapper';
import {
  validateEnabledStrategies,
  validateStrategyVersions
} from '../../src/adapters/outbound/google-sheets/trading-strategy/trading-strategy-sheet';

afterEach(() => vi.unstubAllGlobals());

const headers = ['Strategy ID', 'Name', 'Type', 'Enabled', 'Description'];
const versionHeaders = [
  'Strategy ID',
  'Version',
  'Enabled',
  'Screener Code',
  'Screener',
  'Finviz URL'
];

describe('trading strategy row characterization', () => {
  it('preserves strategy trimming and requires explicit enabled values', () => {
    expect(
      mapTradingStrategyRow(headers, [' ID ', ' Name ', ' MOMENTUM ', true, ' Description '])
    ).toEqual({
      id: 'ID',
      name: 'Name',
      type: 'MOMENTUM',
      enabled: true,
      description: 'Description'
    });
    expect(mapTradingStrategyRow(headers, ['', '', '', 'TRUE', '']).enabled).toBe(true);
    expect(mapTradingStrategyRow(headers, ['', '', '', 'FALSE', '']).enabled).toBe(false);
    expect(() => mapTradingStrategyRow(headers, ['', '', '', '', ''])).toThrow(
      'Enabled obligatoire.'
    );
  });

  it('maps versioned screener configuration separately', () => {
    expect(
      mapTradingStrategyVersionRow(versionHeaders, [
        ' momentum_breakout ',
        ' V1 ',
        true,
        ' MOMENTUM_BREAKOUT_V1 ',
        ' FINVIZ ',
        ' https://example.test/export '
      ])
    ).toEqual({
      strategyId: 'MOMENTUM_BREAKOUT',
      version: 'V1',
      enabled: true,
      screenerCode: 'MOMENTUM_BREAKOUT_V1',
      screener: 'FINVIZ',
      screenerUrl: 'https://example.test/export'
    });
  });

  it('preserves the shared missing-column error', () => {
    expect(() => mapTradingStrategyRow(headers.slice(0, -1), [])).toThrow(
      'Colonne absente : Description'
    );
  });

  it('looks up IDs case-insensitively and returns the first matching row', () => {
    const rows = [
      ['ABC', 'First', 'MOMENTUM', true, ''],
      ['abc', 'Second', 'MOMENTUM', true, '']
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
      ['ABC', 'First', 'MOMENTUM', true, ''],
      ['DEF', 'Second', 'MOMENTUM', false, '']
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

  it('ignores trailing checkbox-only rows when listing strategies', () => {
    const rows = [
      ['ABC', 'First', 'MOMENTUM', true, ''],
      ['', '', '', false, '']
    ];
    const sheet = {
      getLastRow: () => 3,
      getLastColumn: () => headers.length,
      getRange: () => ({
        getValues: () => [headers, ...rows]
      })
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });

    expect(new GoogleSheetsTradingStrategyReader().listAll().map((item) => item.id)).toEqual([
      'ABC'
    ]);
  });

  it('returns an empty strategy list for a canonical header-only sheet', () => {
    const sheet = {
      getLastRow: () => 1,
      getLastColumn: () => headers.length,
      getRange: () => ({
        getValues: () => [headers]
      })
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });

    expect(new GoogleSheetsTradingStrategyReader().listAll()).toEqual([]);
  });

  it('ignores trailing checkbox-only rows when listing strategy versions', () => {
    const rows = [
      [
        'MOMENTUM_BREAKOUT',
        'V1',
        true,
        'MOMENTUM_BREAKOUT_V1',
        'FINVIZ',
        'https://example.test/export'
      ],
      ['', '', false, '', '', '']
    ];
    const sheet = {
      getLastRow: () => 3,
      getLastColumn: () => versionHeaders.length,
      getRange: () => ({
        getValues: () => [versionHeaders, ...rows]
      })
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name: string) => (name === 'Strategy Versions' ? sheet : null)
      })
    });

    expect(new GoogleSheetsTradingStrategyReader().listVersions()).toEqual([
      {
        strategyId: 'MOMENTUM_BREAKOUT',
        version: 'V1',
        enabled: true,
        screenerCode: 'MOMENTUM_BREAKOUT_V1',
        screener: 'FINVIZ',
        screenerUrl: 'https://example.test/export'
      }
    ]);
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
    type: 'MOMENTUM',
    enabled: true,
    description: '',
    ...overrides
  };
}

function version(overrides = {}) {
  return {
    strategyId: 'MOMENTUM_BREAKOUT',
    version: 'V1',
    enabled: true,
    screenerCode: 'MOMENTUM_BREAKOUT_V1',
    screener: 'FINVIZ' as const,
    screenerUrl: 'https://example.test/export',
    ...overrides
  };
}

describe('strategy validation characterization', () => {
  it('allows an empty canonical strategy table during workbook setup', () => {
    expect(validateEnabledStrategies([])).toBe(true);
  });

  it('validates duplicate Strategy IDs after canonical normalization', () => {
    expect(() =>
      validateEnabledStrategies([strategy({ id: 'ABC' }), strategy({ id: 'abc' })])
    ).toThrow('Strategy ID dupliqué : ABC');
  });

  it('preserves ID validation without strategy-level financial policy', () => {
    expect(() => validateEnabledStrategies([strategy({ id: '' })])).toThrow(
      'Strategy ID obligatoire.'
    );
    expect(validateEnabledStrategies([strategy()])).toBe(true);
  });

  it('validates one active version per enabled strategy and ignores disabled parents', () => {
    expect(validateStrategyVersions([strategy()], [version()])).toBe(true);
    expect(() =>
      validateStrategyVersions([strategy()], [version(), version({ version: 'V2' })])
    ).toThrow('Plusieurs versions actives pour MOMENTUM_BREAKOUT');
    expect(validateStrategyVersions([strategy({ enabled: false })], [version()])).toBe(true);
    expect(validateStrategyVersions([strategy()], [version({ enabled: false })])).toBe(true);
  });

  it('keeps disabled historical versions readable but prevents duplicate identities', () => {
    expect(
      validateStrategyVersions(
        [strategy()],
        [version({ enabled: false }), version({ version: 'V2', enabled: true })]
      )
    ).toBe(true);
    expect(() =>
      validateStrategyVersions(
        [strategy()],
        [version({ enabled: false }), version({ enabled: false })]
      )
    ).toThrow('Strategy Version dupliquée : MOMENTUM_BREAKOUT|V1');
    expect(() =>
      validateStrategyVersions([strategy()], [version({ strategyId: 'UNKNOWN' })])
    ).toThrow('Strategy inconnue : UNKNOWN');
  });
});
