/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapLegacyCockpitConfiguration,
  readLegacyCockpitConfiguration,
  setupLegacyCockpitConfiguration
} from '../../src/adapters/outbound/google-sheets/cockpit-configuration-sheet';

afterEach(() => vi.unstubAllGlobals());

const validRows = [
  ['Account Name', ' Trading '],
  ['Account Equity', 10000],
  ['Default Risk %', 0.005],
  ['Max Position %', 0.1],
  ['Currency', ' cad ']
];

describe('legacy Cockpit Config compatibility', () => {
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
    const spreadsheet = {
      getSheetByName: vi.fn(() => ({})),
      insertSheet: vi.fn(),
      toast
    };
    vi.stubGlobal('SpreadsheetApp', { getActiveSpreadsheet: () => spreadsheet });
    setupLegacyCockpitConfiguration();
    expect(spreadsheet.insertSheet).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Cockpit Config existe déjà.', 'Trading Cockpit', 5);
  });

  it('preserves missing and empty sheet errors', () => {
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => null })
    });
    expect(readLegacyCockpitConfiguration).toThrow(
      "Cockpit Config est absent. Exécute d'abord Setup Cockpit Config."
    );

    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => ({ getLastRow: () => 3 })
      })
    });
    expect(readLegacyCockpitConfiguration).toThrow('Cockpit Config est vide.');
  });

  it('preserves the physical setup values, formats and layout', () => {
    const range = {
      setValues: vi.fn(),
      merge: vi.fn(),
      setFontWeight: vi.fn(),
      setFontSize: vi.fn(),
      setNumberFormat: vi.fn()
    };
    Object.values(range).forEach((method) => method.mockReturnValue(range));
    const sheet = {
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
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 8, 3);
    expect(range.setValues.mock.calls[0][0]).toEqual([
      ['TRADING COCKPIT CONFIG', '', ''],
      ['', '', ''],
      ['Parameter', 'Value', 'Description'],
      ['Account Name', 'Trading', 'Nom du compte utilisé pour le trading actif'],
      ['Account Equity', 10000, 'Valeur actuelle du compte utilisée pour le position sizing'],
      ['Default Risk %', 0.005, 'Risque maximal par trade'],
      ['Max Position %', 0.1, 'Exposition maximale recommandée par position'],
      ['Currency', 'CAD', 'Devise du compte']
    ]);
    expect(sheet.getRange).toHaveBeenCalledWith('A1:C1');
    expect(sheet.getRange).toHaveBeenCalledWith('A3:C3');
    expect(sheet.getRange).toHaveBeenCalledWith('B5');
    expect(sheet.getRange).toHaveBeenCalledWith('B6');
    expect(sheet.getRange).toHaveBeenCalledWith('B7');
    expect(sheet.setFrozenRows).toHaveBeenCalledWith(3);
    expect(sheet.autoResizeColumns).toHaveBeenCalledWith(1, 3);
    expect(spreadsheet.toast).toHaveBeenCalledWith('Cockpit Config créé.', 'Trading Cockpit', 5);
  });
});
