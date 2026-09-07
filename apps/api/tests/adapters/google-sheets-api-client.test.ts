import { describe, expect, it, vi } from 'vitest';

const googleMocks = vi.hoisted(() => ({
  batchGet: vi.fn(),
  getClient: vi.fn(async () => ({ client: 'auth' })),
  sheets: vi.fn()
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      getClient: googleMocks.getClient
    },
    sheets: googleMocks.sheets
  }
}));

import { createGoogleSheetsApiClient } from '../../src/adapters/outbound/google-sheets-api/google-sheets-api-client';

describe('Google Sheets API client', () => {
  it('associates batchGet values to requested ranges when Google returns canonical ranges', async () => {
    googleMocks.batchGet.mockResolvedValueOnce({
      data: {
        valueRanges: [
          {
            range: 'Candidate Table!A1:U1000',
            values: [['Rank', 'Ticker']]
          },
          {
            range: 'Watchlist!A1:V1000',
            values: [['Watchlist ID', 'Ticker']]
          }
        ]
      }
    });
    googleMocks.sheets.mockReturnValueOnce({
      spreadsheets: {
        values: {
          batchGet: googleMocks.batchGet
        }
      }
    });

    const client = await createGoogleSheetsApiClient();
    const responses = await client.batchGetValues?.({
      spreadsheetId: 'spreadsheet-id',
      ranges: ["'Candidate Table'!A:U", "'Watchlist'!A:V"],
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER'
    });

    expect(responses?.["'Candidate Table'!A:U"]).toEqual({
      values: [['Rank', 'Ticker']]
    });
    expect(responses?.["'Watchlist'!A:V"]).toEqual({
      values: [['Watchlist ID', 'Ticker']]
    });
    expect(responses?.['Candidate Table!A1:U1000']).toEqual({
      values: [['Rank', 'Ticker']]
    });
    expect(responses?.['Watchlist!A1:V1000']).toEqual({
      values: [['Watchlist ID', 'Ticker']]
    });
  });
});
