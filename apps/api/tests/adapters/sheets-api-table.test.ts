import { describe, expect, it, vi } from 'vitest';
import type { SheetsValuesClient } from '../../src/adapters/outbound/google-sheets-api/google-sheets-api-client';
import {
  createRequestScopedSheets,
  requireColumn,
  requireSheetHeaders,
  textValue,
  valueByHeader
} from '../../src/adapters/outbound/google-sheets-api/sheets-api-table';

const MS_PER_DAY = 86_400_000;
const SHEETS_SERIAL_EPOCH_OFFSET = 25569;

function sheetsSerialDate(isoDate: string): number {
  return new Date(isoDate).getTime() / MS_PER_DAY + SHEETS_SERIAL_EPOCH_OFFSET;
}

function clientByRange(valuesByRange: Record<string, unknown[][]>): SheetsValuesClient {
  return {
    getValues: vi.fn(async ({ range }: { range: string }) => ({
      values: valuesByRange[range] ?? []
    })),
    batchGetValues: vi.fn(async ({ ranges }) =>
      Object.fromEntries(
        ranges.map((range: string) => [range, { values: valuesByRange[range] ?? [] }])
      )
    )
  };
}

describe('Sheets API request-scoped table loader', () => {
  it('normalizes headers, dates and rows from one values request', async () => {
    const client = clientByRange({
      "'Watchlist'!A:C": [
        [' Date ', 'Ticker', 'Score'],
        [sheetsSerialDate('2026-08-27T00:00:00.000Z'), 'BOX', 87]
      ]
    });
    const sheets = createRequestScopedSheets({ sheetsClient: client, spreadsheetId: 'sheet-id' });

    const loaded = await sheets.getTable({
      key: 'watchlist',
      sheetName: 'Watchlist',
      range: "'Watchlist'!A:C",
      requiredHeaders: ['Date', 'Ticker'],
      dateHeaders: ['Date']
    });

    expect(client.getValues).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      range: "'Watchlist'!A:C",
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER'
    });
    expect(loaded.table.headers).toEqual(['Date', 'Ticker', 'Score']);
    expect(valueByHeader(loaded.table.headers, loaded.table.rows[0], 'Date')).toBeInstanceOf(Date);
    expect(valueByHeader(loaded.table.headers, loaded.table.rows[0], 'Ticker')).toBe('BOX');
  });

  it('caches loaded tables for the duration of one request', async () => {
    const client = clientByRange({
      "'Watchlist'!A:B": [
        ['Ticker', 'Status'],
        ['BOX', 'WATCHING']
      ]
    });
    const sheets = createRequestScopedSheets({ sheetsClient: client, spreadsheetId: 'sheet-id' });
    const definition = {
      key: 'watchlist',
      sheetName: 'Watchlist',
      range: "'Watchlist'!A:B",
      requiredHeaders: ['Ticker']
    };

    const first = await sheets.getTable(definition);
    const second = await sheets.getTable(definition);

    expect(first).toBe(second);
    expect(client.getValues).toHaveBeenCalledOnce();
  });

  it('batch loads missing tables once and reuses them without follow-up reads', async () => {
    const client = clientByRange({
      "'Watchlist'!A:B": [
        ['Ticker', 'Status'],
        ['BOX', 'WATCHING']
      ],
      "'Positions'!A:B": [
        ['Position ID', 'Ticker'],
        ['P1', 'BOX']
      ]
    });
    const sheets = createRequestScopedSheets({ sheetsClient: client, spreadsheetId: 'sheet-id' });
    const watchlist = {
      key: 'watchlist',
      sheetName: 'Watchlist',
      range: "'Watchlist'!A:B",
      requiredHeaders: ['Ticker']
    };
    const positions = {
      key: 'positions',
      sheetName: 'Positions',
      range: "'Positions'!A:B",
      requiredHeaders: ['Position ID']
    };

    await sheets.batchLoad([watchlist, positions]);
    await sheets.getTable(watchlist);
    await sheets.getTable(positions);

    expect(client.batchGetValues).toHaveBeenCalledOnce();
    expect(client.getValues).not.toHaveBeenCalled();
  });

  it('maps batchGet canonicalized returned ranges back to requested logical tables', async () => {
    const client: SheetsValuesClient = {
      getValues: vi.fn(async () => ({ values: [] })),
      batchGetValues: vi.fn(async () => ({
        'Momentum Ranking!A1:U1000': {
          values: [
            ['Rank', 'Ticker'],
            [1, 'BOX']
          ]
        },
        'Watchlist!A1:V1000': {
          values: [
            ['Watchlist ID', 'Ticker'],
            ['WL-1', 'BOX']
          ]
        },
        "'Momentum Ranking'!A:U": {},
        "'Watchlist'!A:V": {}
      }))
    };
    const sheets = createRequestScopedSheets({ sheetsClient: client, spreadsheetId: 'sheet-id' });
    const momentum = {
      key: 'momentumRanking',
      sheetName: 'Momentum Ranking',
      range: "'Momentum Ranking'!A:U",
      requiredHeaders: ['Rank', 'Ticker']
    };
    const watchlist = {
      key: 'watchlist',
      sheetName: 'Watchlist',
      range: "'Watchlist'!A:V",
      requiredHeaders: ['Watchlist ID', 'Ticker']
    };

    await sheets.batchLoad([momentum, watchlist]);

    expect((await sheets.getTable(momentum)).table.headers).toEqual(['Rank', 'Ticker']);
    expect((await sheets.getTable(watchlist)).table.headers).toEqual(['Watchlist ID', 'Ticker']);
    expect((await sheets.getTable(momentum)).table.rows).toEqual([[1, 'BOX']]);
    expect(client.getValues).not.toHaveBeenCalled();
  });

  it('keeps the table cache keyed by logical definition after canonicalized batchGet', async () => {
    const client: SheetsValuesClient = {
      getValues: vi.fn(async () => ({ values: [] })),
      batchGetValues: vi.fn(async () => ({
        'Trade Plans!A1:AD1000': {
          values: [
            ['Trade Plan ID', 'Ticker'],
            ['TP-1', 'BOX']
          ]
        },
        'Strategies!A1:H1000': {
          values: [
            ['Strategy ID', 'Enabled'],
            ['MOMENTUM_BREAKOUT', true]
          ]
        },
        "'Trade Plans'!A:AD": {},
        "'Strategies'!A:H": {}
      }))
    };
    const sheets = createRequestScopedSheets({ sheetsClient: client, spreadsheetId: 'sheet-id' });
    const tradePlans = {
      key: 'tradePlans',
      sheetName: 'Trade Plans',
      range: "'Trade Plans'!A:AD",
      requiredHeaders: ['Trade Plan ID', 'Ticker']
    };
    const strategies = {
      key: 'strategies',
      sheetName: 'Strategies',
      range: "'Strategies'!A:H",
      requiredHeaders: ['Strategy ID', 'Enabled']
    };

    await sheets.batchLoad([tradePlans, strategies]);
    const first = await sheets.getTable(tradePlans);
    const second = await sheets.getTable(tradePlans);

    expect(first).toBe(second);
    expect(first.table.headers).toEqual(['Trade Plan ID', 'Ticker']);
    expect((await sheets.getTable(strategies)).table.headers).toEqual(['Strategy ID', 'Enabled']);
    expect(client.getValues).not.toHaveBeenCalled();
  });

  it('fails loudly on missing required columns', async () => {
    const client = clientByRange({
      "'Watchlist'!A:B": [['Ticker', 'Status']]
    });
    const sheets = createRequestScopedSheets({ sheetsClient: client, spreadsheetId: 'sheet-id' });

    await expect(
      sheets.getTable({
        key: 'watchlist',
        sheetName: 'Watchlist',
        range: "'Watchlist'!A:B",
        requiredHeaders: ['Ticker', 'Current Price']
      })
    ).rejects.toThrow('Watchlist est incomplet : colonne Current Price absente.');
  });

  it('keeps low-level header helpers deterministic', () => {
    const headers = ['Ticker', 'Status'];
    const row = ['BOX', 'WATCHING'];

    expect(requireColumn(headers, 'Status')).toBe(1);
    expect(valueByHeader(headers, row, 'Ticker')).toBe('BOX');
    expect(textValue(' BOX ')).toBe('BOX');
    expect(() => requireSheetHeaders(headers, ['Ticker', 'Account ID'], 'Accounts')).toThrow(
      'Accounts est incomplet : colonne Account ID absente.'
    );
  });
});
