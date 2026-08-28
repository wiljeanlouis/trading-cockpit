/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getTradingCockpitSpreadsheet,
  rememberActiveTradingCockpitSpreadsheet
} from '../../src/adapters/outbound/google-sheets/trading-cockpit-spreadsheet';

afterEach(() => vi.unstubAllGlobals());

describe('Trading Cockpit spreadsheet locator', () => {
  it('registers the bound spreadsheet when the Sheet opens', () => {
    const setProperty = vi.fn();
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getId: () => 'cockpit-sheet-id' })
    });
    vi.stubGlobal('PropertiesService', {
      getScriptProperties: () => ({ setProperty })
    });

    rememberActiveTradingCockpitSpreadsheet();

    expect(setProperty).toHaveBeenCalledWith('TRADING_COCKPIT_SPREADSHEET_ID', 'cockpit-sheet-id');
  });

  it('opens the registered spreadsheet when called from a Web App', () => {
    const spreadsheet = { getId: () => 'cockpit-sheet-id' };
    const openById = vi.fn(() => spreadsheet);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => null,
      openById
    });
    vi.stubGlobal('PropertiesService', {
      getScriptProperties: () => ({
        getProperty: () => 'cockpit-sheet-id'
      })
    });

    expect(getTradingCockpitSpreadsheet()).toBe(spreadsheet);
    expect(openById).toHaveBeenCalledWith('cockpit-sheet-id');
  });

  it('returns an actionable error if the Sheet has never initialized the registration', () => {
    vi.stubGlobal('SpreadsheetApp', { getActiveSpreadsheet: () => null });
    vi.stubGlobal('PropertiesService', {
      getScriptProperties: () => ({ getProperty: () => null })
    });

    expect(() => getTradingCockpitSpreadsheet()).toThrow(
      'Open the Google Sheet once to initialize it.'
    );
  });
});
