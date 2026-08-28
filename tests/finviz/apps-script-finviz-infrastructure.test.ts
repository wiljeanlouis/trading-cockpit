/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppsScriptFinvizTokenStorage } from '../../src/adapters/outbound/finviz/apps-script-finviz-token-storage';
import { AppsScriptFinvizTransport } from '../../src/adapters/outbound/finviz/apps-script-finviz-transport';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Apps Script Finviz infrastructure', () => {
  it('preserves UrlFetchApp options and CSV parsing', () => {
    const response = {
      getResponseCode: vi.fn(() => 200),
      getContentText: vi.fn(() => 'Ticker\nBOX'),
      getAllHeaders: vi.fn(() => ({ 'Content-Type': 'text/csv; charset=utf-8' }))
    };
    const fetch = vi.fn(() => response);
    const parseCsv = vi.fn(() => [['Ticker'], ['BOX']]);
    vi.stubGlobal('UrlFetchApp', { fetch });
    vi.stubGlobal('Utilities', { parseCsv });

    const transport = new AppsScriptFinvizTransport();
    expect(transport.fetch('https://example.test')).toEqual({
      status: 200,
      content: 'Ticker\nBOX',
      contentType: 'text/csv; charset=utf-8'
    });
    expect(fetch).toHaveBeenCalledWith('https://example.test', {
      method: 'get',
      followRedirects: true,
      muteHttpExceptions: true
    });
    expect(transport.parseCsv('Ticker\nBOX')).toEqual([['Ticker'], ['BOX']]);
    expect(parseCsv).toHaveBeenCalledWith('Ticker\nBOX');
  });

  it('preserves FINVIZ_TOKEN in Script Properties', () => {
    const properties = {
      getProperty: vi.fn(() => 'secret'),
      setProperty: vi.fn(),
      deleteProperty: vi.fn()
    };
    vi.stubGlobal('PropertiesService', {
      getScriptProperties: vi.fn(() => properties)
    });

    const storage = new AppsScriptFinvizTokenStorage();
    expect(storage.get()).toBe('secret');
    storage.set('replacement');
    storage.delete();
    expect(properties.getProperty).toHaveBeenCalledWith('FINVIZ_TOKEN');
    expect(properties.setProperty).toHaveBeenCalledWith('FINVIZ_TOKEN', 'replacement');
    expect(properties.deleteProperty).toHaveBeenCalledWith('FINVIZ_TOKEN');
  });
});
