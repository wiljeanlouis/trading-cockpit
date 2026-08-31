import { google, type sheets_v4 } from 'googleapis';

export interface SheetsValuesResponse {
  values?: unknown[][];
}

export interface SheetsValuesClient {
  getSpreadsheet?(request: { spreadsheetId: string }): Promise<{ sheetTitles: string[] }>;
  getValues(request: {
    spreadsheetId: string;
    range: string;
    valueRenderOption: 'UNFORMATTED_VALUE';
    dateTimeRenderOption: 'SERIAL_NUMBER';
  }): Promise<SheetsValuesResponse>;
  batchGetValues?(request: {
    spreadsheetId: string;
    ranges: readonly string[];
    valueRenderOption: 'UNFORMATTED_VALUE';
    dateTimeRenderOption: 'SERIAL_NUMBER';
  }): Promise<Record<string, SheetsValuesResponse>>;
  appendValues?(request: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
    valueInputOption: 'RAW' | 'USER_ENTERED';
    insertDataOption?: 'INSERT_ROWS' | 'OVERWRITE';
  }): Promise<void>;
  updateValues?(request: {
    spreadsheetId: string;
    range: string;
    values: unknown[][];
    valueInputOption: 'RAW' | 'USER_ENTERED';
  }): Promise<void>;
  batchUpdateValues?(request: {
    spreadsheetId: string;
    data: Array<{ range: string; values: unknown[][] }>;
    valueInputOption: 'RAW' | 'USER_ENTERED';
  }): Promise<void>;
  batchUpdateSpreadsheet?(request: {
    spreadsheetId: string;
    requests: sheets_v4.Schema$Request[];
  }): Promise<void>;
}

export async function createGoogleSheetsApiClient(): Promise<SheetsValuesClient> {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  return {
    async getSpreadsheet(request) {
      const response = await sheets.spreadsheets.get({
        spreadsheetId: request.spreadsheetId,
        fields: 'sheets.properties.title'
      });
      return {
        sheetTitles: (response.data.sheets ?? [])
          .map((sheet) => sheet.properties?.title)
          .filter((title): title is string => Boolean(title))
      };
    },
    async getValues(request) {
      const response = await sheets.spreadsheets.values.get(request);
      return {
        values: response.data.values as unknown[][] | undefined
      };
    },
    async batchGetValues(request) {
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: request.spreadsheetId,
        ranges: [...request.ranges],
        valueRenderOption: request.valueRenderOption,
        dateTimeRenderOption: request.dateTimeRenderOption
      });
      const byRange: Record<string, SheetsValuesResponse> = {};
      for (const [index, valueRange] of (response.data.valueRanges ?? []).entries()) {
        const values = {
          values: valueRange.values as unknown[][] | undefined
        };
        const requestedRange = request.ranges[index];
        if (requestedRange) byRange[requestedRange] = values;
        if (valueRange.range) byRange[valueRange.range] = values;
      }
      request.ranges.forEach((range) => {
        byRange[range] ??= {};
      });
      return byRange;
    },
    async appendValues(request) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: request.spreadsheetId,
        range: request.range,
        valueInputOption: request.valueInputOption,
        insertDataOption: request.insertDataOption ?? 'INSERT_ROWS',
        requestBody: {
          values: request.values
        }
      });
    },
    async updateValues(request) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: request.spreadsheetId,
        range: request.range,
        valueInputOption: request.valueInputOption,
        requestBody: {
          values: request.values
        }
      });
    },
    async batchUpdateValues(request) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: request.spreadsheetId,
        requestBody: {
          valueInputOption: request.valueInputOption,
          data: request.data
        }
      });
    },
    async batchUpdateSpreadsheet(request) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: request.spreadsheetId,
        requestBody: {
          requests: request.requests
        }
      });
    }
  };
}
