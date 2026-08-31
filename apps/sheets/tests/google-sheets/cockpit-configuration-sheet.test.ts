/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapLegacyCockpitConfiguration,
  readLegacyCockpitConfiguration,
  setupLegacyCockpitConfiguration
} from '../../src/adapters/outbound/google-sheets/cockpit-config/cockpit-configuration-sheet';

afterEach(() => vi.unstubAllGlobals());

const validRows = [
  ['Account Name', ' Trading '],
  ['Account Equity', 10000],
  ['Default Risk %', 0.005],
  ['Max Position %', 0.1],
  ['Currency', ' cad ']
];

describe('Cockpit Config DATA sheet contract', () => {
  it('preserves mapping and normalization without becoming Trade Plan authority', () => {
    expect(mapLegacyCockpitConfiguration(validRows)).toEqual({
      accountName: 'Trading',
      accountEquity: 10000,
      defaultRiskPercent: 0.005,
      maxPositionPercent: 0.1,
      currency: 'CAD'
    });
  });

  it.each([
    ['Account Name', '', 'Account Name est obligatoire.'],
    ['Account Equity', 0, 'Account Equity doit être supérieur à 0.'],
    ['Default Risk %', 0, 'Default Risk % doit être compris entre 0% et 100%.'],
    ['Default Risk %', 1.01, 'Default Risk % doit être compris entre 0% et 100%.'],
    ['Max Position %', 0, 'Max Position % doit être compris entre 0% et 100%.'],
    ['Currency', '', 'Currency est obligatoire.']
  ])('preserves validation for %s', (parameter, value, message) => {
    const rows = validRows.map((row) => (row[0] === parameter ? [parameter, value] : row));
    expect(() => mapLegacyCockpitConfiguration(rows)).toThrow(message);
  });

  it('keeps setup idempotent when the sheet already exists', () => {
    const toast = vi.fn();
    const existing = {
      getLastRow: () => 1,
      getLastColumn: () => 1,
      getRange: () => ({ getValues: () => [['existing']] })
    };
    const spreadsheet = {
      getSheetByName: vi.fn(() => existing),
      insertSheet: vi.fn(),
      toast
    };
    vi.stubGlobal('SpreadsheetApp', { getActiveSpreadsheet: () => spreadsheet });
    setupLegacyCockpitConfiguration();
    expect(spreadsheet.insertSheet).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Cockpit Config existe déjà.', 'Trading Cockpit', 5);
  });

  it('preserves missing, empty and old-layout sheet errors', () => {
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => null })
    });
    expect(readLegacyCockpitConfiguration).toThrow(
      "Cockpit Config est absent. Exécute d'abord Initialize Trading Cockpit depuis le menu Setup."
    );

    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => ({ getLastRow: () => 1 })
      })
    });
    expect(readLegacyCockpitConfiguration).toThrow('Cockpit Config est vide.');

    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => ({
          getLastRow: () => 4,
          getLastColumn: () => 3,
          getRange: (row: number) => ({
            getValues: () =>
              row === 1 ? [['TRADING COCKPIT CONFIG', '', '']] : [['Account Name', 'Trading']]
          })
        })
      })
    });
    expect(readLegacyCockpitConfiguration).toThrow(
      'Cockpit Config utilise un ancien schéma. Colonne absente : Parameter'
    );
  });

  it('creates row-1 headers and row-2+ records', () => {
    const range = {
      setValues: vi.fn(),
      merge: vi.fn(),
      setFontWeight: vi.fn(),
      setFontSize: vi.fn(),
      setNumberFormat: vi.fn()
    };
    Object.values(range).forEach((method) => method.mockReturnValue(range));
    const sheet = {
      clear: vi.fn(),
      getRange: vi.fn(() => range),
      setFrozenRows: vi.fn(),
      autoResizeColumns: vi.fn()
    };
    const spreadsheet = {
      getSheetByName: vi.fn(() => null),
      insertSheet: vi.fn(() => sheet),
      toast: vi.fn()
    };
    vi.stubGlobal('SpreadsheetApp', { getActiveSpreadsheet: () => spreadsheet });

    setupLegacyCockpitConfiguration();

    expect(spreadsheet.insertSheet).toHaveBeenCalledWith('Cockpit Config');
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 6, 3);
    expect(range.setValues.mock.calls[0][0]).toEqual([
      ['Parameter', 'Value', 'Description'],
      ['Account Name', 'Trading', 'Nom du compte utilisé pour le trading actif'],
      ['Account Equity', 10000, 'Valeur actuelle du compte utilisée pour le position sizing'],
      ['Default Risk %', 0.005, 'Risque maximal par trade'],
      ['Max Position %', 0.1, 'Exposition maximale recommandée par position'],
      ['Currency', 'CAD', 'Devise du compte']
    ]);
    expect(sheet.getRange).toHaveBeenCalledWith('A1:C1');
    expect(sheet.getRange).toHaveBeenCalledWith('B3');
    expect(sheet.getRange).toHaveBeenCalledWith('B4');
    expect(sheet.getRange).toHaveBeenCalledWith('B5');
    expect(sheet.setFrozenRows).toHaveBeenCalledWith(1);
    expect(sheet.autoResizeColumns).toHaveBeenCalledWith(1, 3);
    expect(spreadsheet.toast).toHaveBeenCalledWith('Cockpit Config créé.', 'Trading Cockpit', 5);
  });
});
