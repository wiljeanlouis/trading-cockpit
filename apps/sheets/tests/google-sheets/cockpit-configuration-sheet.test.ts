/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapLegacyCockpitConfiguration,
  readLegacyCockpitConfiguration,
  setupLegacyCockpitConfiguration
} from '../../src/adapters/outbound/google-sheets/cockpit-config/cockpit-configuration-sheet';

afterEach(() => vi.unstubAllGlobals());

describe('Cockpit Config DATA sheet contract', () => {
  it('maps global settings without account-level financial authority', () => {
    expect(
      mapLegacyCockpitConfiguration([
        ['Some Global Setting', 'enabled', 'A valid future global setting'],
        ['', 'ignored', 'blank parameter is ignored']
      ])
    ).toEqual({
      settings: [
        {
          parameter: 'Some Global Setting',
          value: 'enabled',
          description: 'A valid future global setting'
        }
      ]
    });
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

  it('preserves missing and old-layout sheet errors while accepting headers-only config', () => {
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => null })
    });
    expect(readLegacyCockpitConfiguration).toThrow(
      "Cockpit Config est absent. Exécute d'abord Initialize Trading Cockpit depuis le menu Setup."
    );

    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => ({
          getLastRow: () => 1,
          getLastColumn: () => 3,
          getRange: () => ({ getValues: () => [['Parameter', 'Value', 'Description']] })
        })
      })
    });
    expect(readLegacyCockpitConfiguration()).toEqual({ settings: [] });

    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => ({
          getLastRow: () => 1,
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

  it('creates row-1 headers without obsolete account financial records', () => {
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
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 1, 3);
    expect(range.setValues.mock.calls[0][0]).toEqual([['Parameter', 'Value', 'Description']]);
    expect(sheet.getRange).toHaveBeenCalledWith('A1:C1');
    expect(sheet.getRange).not.toHaveBeenCalledWith('B3');
    expect(sheet.getRange).not.toHaveBeenCalledWith('B4');
    expect(sheet.getRange).not.toHaveBeenCalledWith('B5');
    expect(sheet.setFrozenRows).toHaveBeenCalledWith(1);
    expect(sheet.autoResizeColumns).toHaveBeenCalledWith(1, 3);
    expect(spreadsheet.toast).toHaveBeenCalledWith('Cockpit Config créé.', 'Trading Cockpit', 5);
  });
});
