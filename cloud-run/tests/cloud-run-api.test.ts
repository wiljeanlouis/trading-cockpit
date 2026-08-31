import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGetWatchlist } from '@trading-cockpit/backend-core/application/watchlist/get-watchlist';
import { createCloudRunApp, createCloudRunRequestHandler, handleCloudRunRequest } from '../src/app';
import { loadConfig, requireSpreadsheetId } from '../src/config';
import { getWatchlistForCloudRun } from '../src/composition/watchlist';
import type { GoogleIdTokenVerifier, GoogleTokenPayload } from '../src/auth/google-id-token-auth';
import type { SheetsValuesClient } from '../src/adapters/outbound/google-sheets-api/google-sheets-api-client';
import {
  LoadedWatchlistReader,
  readWatchlistEntries,
  SHEET_DEFINITIONS,
  WATCHLIST_HEADERS
} from '../src/adapters/outbound/google-sheets-api/cockpit-query-readers';
import { createQueryContext } from '../src/composition/query-context';

const MS_PER_DAY = 86_400_000;
const SHEETS_SERIAL_EPOCH_OFFSET = 25569;

afterEach(() => vi.restoreAllMocks());

function sheetsSerialDate(isoDate: string): number {
  return new Date(isoDate).getTime() / MS_PER_DAY + SHEETS_SERIAL_EPOCH_OFFSET;
}

function rowFor(values: Record<string, unknown>): unknown[] {
  return WATCHLIST_HEADERS.map((header) => values[header] ?? '');
}

function rowForHeaders(headers: readonly string[], values: Record<string, unknown>): unknown[] {
  return headers.map((header) => values[header] ?? '');
}

function sheetsClient(values: unknown[][]): SheetsValuesClient {
  return {
    getValues: vi.fn(async () => ({ values }))
  };
}

function sheetsClientByRange(valuesByRange: Record<string, unknown[][]>): SheetsValuesClient {
  return {
    getValues: vi.fn(async ({ range }) => ({ values: valuesByRange[range] ?? [] })),
    batchGetValues: vi.fn(async ({ ranges }: { ranges: readonly string[] }) =>
      Object.fromEntries(
        ranges.map((range: string) => [range, { values: valuesByRange[range] ?? [] }])
      )
    )
  };
}

function mutableSheetsClientByRange(
  valuesByRange: Record<string, unknown[][]>
): SheetsValuesClient {
  return {
    ...sheetsClientByRange(valuesByRange),
    appendValues: vi.fn(async () => undefined),
    updateValues: vi.fn(async () => undefined),
    batchUpdateValues: vi.fn(async () => undefined),
    getSpreadsheet: vi.fn(async () => ({
      sheetTitles: [
        'Watchlist',
        'Trade Plans',
        'Positions',
        'Journal',
        'Accounts',
        'Strategies',
        'Capital Ledger',
        'Momentum Ranking',
        'Cockpit Config'
      ]
    })),
    batchUpdateSpreadsheet: vi.fn(async () => undefined)
  };
}

function authorizedTokenVerifier(
  overrides: Partial<GoogleTokenPayload> = {}
): GoogleIdTokenVerifier {
  return {
    verify: vi.fn(async () => ({
      audience: 'google-client-id',
      email: 'trader@example.com',
      emailVerified: true,
      issuer: 'https://accounts.google.com',
      subject: 'google-subject',
      ...overrides
    }))
  };
}

function testAuthConfig() {
  return {
    googleClientId: 'google-client-id',
    allowedEmails: ['trader@example.com']
  };
}

function testCorsConfig() {
  return {
    allowedOrigins: ['https://cockpit.example.com']
  };
}

function authorizationHeaders(origin?: string) {
  return {
    authorization: 'Bearer valid-token',
    ...(origin ? { origin } : {})
  };
}

describe('Cloud Run Trading Cockpit API', () => {
  it('maps Google Sheets API headers and rows through the existing Watchlist mapper', async () => {
    const client = sheetsClient([
      [...WATCHLIST_HEADERS],
      rowFor({
        'Watchlist ID': 'W1',
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Strategy: 'Momentum Breakout',
        'Strategy Version': '1.0',
        'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
        Ticker: 'BOX',
        Company: 'Box, Inc.',
        Sector: 'Technology',
        'Current Price': 34.82,
        'Momentum Score': 87,
        Status: 'READY',
        'Setup Status': 'CONFIRMED'
      })
    ]);
    const result = await getWatchlistForCloudRun({
      sheetsClient: client,
      spreadsheetId: 'spreadsheet-id',
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(client.getValues).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      range: "'Watchlist'!A:V",
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER'
    });
    expect(result.dto.items).toEqual([
      expect.objectContaining({
        ticker: 'BOX',
        currentPrice: 34.82,
        momentumScore: 87,
        status: 'READY'
      })
    ]);
    expect(result.dto.items[0].signalDate).toBe('2026-08-27T00:00:00.000Z');
  });

  it('normalizes Sheets serial dates before the existing application use case serializes DTO dates', async () => {
    const result = await getWatchlistForCloudRun({
      sheetsClient: sheetsClient([
        [...WATCHLIST_HEADERS],
        rowFor({
          'Watchlist ID': 'W1',
          'Strategy ID': 'MOMENTUM_BREAKOUT',
          Strategy: 'Momentum Breakout',
          'Strategy Version': '1.0',
          'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
          'Added At': sheetsSerialDate('2026-08-27T14:30:00.000Z'),
          Ticker: 'BOX',
          Status: 'WATCHING'
        })
      ]),
      spreadsheetId: 'spreadsheet-id',
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(result.dto.items[0].signalDate).toBe('2026-08-27T00:00:00.000Z');
    expect(result.dto.generatedAt).toBe('2026-08-28T16:04:00.000Z');
  });

  it('preserves empty and formula-backed values without inventing financial numbers', async () => {
    const result = await getWatchlistForCloudRun({
      sheetsClient: sheetsClient([
        [...WATCHLIST_HEADERS],
        rowFor({
          'Watchlist ID': 'W1',
          'Strategy ID': 'MOMENTUM_BREAKOUT',
          Strategy: 'Momentum Breakout',
          'Strategy Version': '1.0',
          'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
          Ticker: 'BOX',
          'Current Price': '',
          'Momentum Score': '#N/A',
          Status: 'WATCHING'
        })
      ]),
      spreadsheetId: 'spreadsheet-id',
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(result.dto.items[0]).toMatchObject({
      currentPrice: null,
      momentumScore: null
    });
  });

  it('implements the existing WatchlistReader port consumed by createGetWatchlist', async () => {
    const sheets = createQueryContext({
      sheetsClient: sheetsClient([
        [...WATCHLIST_HEADERS],
        rowFor({
          'Watchlist ID': 'W1',
          'Strategy ID': 'MOMENTUM_BREAKOUT',
          Strategy: 'Momentum Breakout',
          'Strategy Version': '1.0',
          'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
          Ticker: 'BOX',
          Status: 'READY'
        })
      ]),
      spreadsheetId: 'spreadsheet-id'
    });
    const reader = new LoadedWatchlistReader(await readWatchlistEntries(sheets));

    const dto = createGetWatchlist({
      reader,
      now: () => new Date('2026-08-28T16:04:00.000Z')
    })();

    expect(dto.items).toHaveLength(1);
    expect(dto.items[0]).toMatchObject({ id: 'W1', ticker: 'BOX', status: 'READY' });
  });

  it('serves /health without accessing Google Sheets', async () => {
    const sheetsClientFactory = vi.fn(async () => sheetsClient([]));
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/health',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory,
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(sheetsClientFactory).not.toHaveBeenCalled();
  });

  it('serves the React SPA from static web assets without accessing Google Sheets', async () => {
    const webDistPath = await createWebDistFixture();
    const sheetsClientFactory = vi.fn(async () => sheetsClient([]));

    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory,
      tokenVerifier: authorizedTokenVerifier(),
      staticAssetsPath: webDistPath
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(String(response.body)).toContain('<div id="root"></div>');
    expect(sheetsClientFactory).not.toHaveBeenCalled();
  });

  it('serves Vite assets and falls back to index.html for React routes', async () => {
    const webDistPath = await createWebDistFixture();

    const assetResponse = await handleCloudRunRequest({
      method: 'GET',
      url: '/assets/app.js',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: authorizedTokenVerifier(),
      staticAssetsPath: webDistPath
    });
    const routeResponse = await handleCloudRunRequest({
      method: 'GET',
      url: '/trade-plans',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: authorizedTokenVerifier(),
      staticAssetsPath: webDistPath
    });

    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.headers['Content-Type']).toBe('text/javascript; charset=utf-8');
    expect(String(assetResponse.body)).toBe('console.log("cockpit");');
    expect(assetResponse.headers['Cache-Control']).toContain('immutable');
    expect(routeResponse.statusCode).toBe(200);
    expect(routeResponse.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(String(routeResponse.body)).toContain('/assets/app.js');
  });

  it('keeps API paths reserved for authenticated API handlers instead of static fallback', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/watchlist',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: authorizedTokenVerifier(),
      staticAssetsPath: await createWebDistFixture()
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required.' });
  });

  it('serves /api/watchlist with the existing WatchlistDto and timing headers', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/watchlist',
      headers: authorizationHeaders(),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () =>
        sheetsClient([
          [...WATCHLIST_HEADERS],
          rowFor({
            'Watchlist ID': 'W1',
            'Strategy ID': 'MOMENTUM_BREAKOUT',
            Strategy: 'Momentum Breakout',
            'Strategy Version': '1.0',
            'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
            Ticker: 'BOX',
            Status: 'READY'
          })
        ]),
      tokenVerifier: authorizedTokenVerifier(),
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['Server-Timing']).toContain('sheets;dur=');
    expect(response.headers['Server-Timing']).toContain('mapping;dur=');
    expect(response.headers['Server-Timing']).toContain('total;dur=');
    expect(response.headers['X-Trading-Cockpit-Items']).toBe('1');
    expect(response.body).toEqual({
      generatedAt: '2026-08-28T16:04:00.000Z',
      items: [
        expect.objectContaining({
          id: 'W1',
          ticker: 'BOX',
          status: 'READY'
        })
      ]
    });
  });

  it('reuses the Google Sheets API client across requests without caching Watchlist data', async () => {
    const client = sheetsClient([
      [...WATCHLIST_HEADERS],
      rowFor({
        'Watchlist ID': 'W1',
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Strategy: 'Momentum Breakout',
        'Strategy Version': '1.0',
        'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
        Ticker: 'BOX',
        Status: 'READY'
      })
    ]);
    const sheetsClientFactory = vi.fn(async () => client);
    const handleRequest = createCloudRunRequestHandler({
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory,
      tokenVerifier: authorizedTokenVerifier(),
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    const firstResponse = await handleRequest({
      method: 'GET',
      url: '/api/watchlist',
      headers: authorizationHeaders()
    });
    const secondResponse = await handleRequest({
      method: 'GET',
      url: '/api/watchlist',
      headers: authorizationHeaders()
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(sheetsClientFactory).toHaveBeenCalledTimes(1);
    expect(client.getValues).toHaveBeenCalledTimes(2);
  });

  it('redacts the spreadsheet ID from production error responses', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const server = createCloudRunApp({
      spreadsheetId: 'sensitive-spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      tokenVerifier: authorizedTokenVerifier(),
      sheetsClientFactory: async () => {
        throw new Error('Cannot access sensitive-spreadsheet-id');
      }
    });
    const response = await new Promise<{
      statusCode: number;
      body: string;
    }>((resolve) => {
      const fakeResponse = {
        writeHead: vi.fn(),
        end: vi.fn((body: string) =>
          resolve({
            statusCode: fakeResponse.writeHead.mock.calls[0][0] as number,
            body
          })
        )
      };
      const fakeRequest = {
        method: 'GET',
        url: '/api/watchlist',
        headers: authorizationHeaders(),
        resume: vi.fn()
      };
      server.emit('request', fakeRequest, fakeResponse);
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Unexpected Trading Cockpit server error.');
    expect(response.body).not.toContain('sensitive-spreadsheet-id');
    expect(errorSpy.mock.calls[0]).toEqual([
      '[trading-cockpit-cloud-run] request failed',
      { message: 'Cannot access [redacted-spreadsheet-id]' }
    ]);
  });

  it('fails clearly when the spreadsheet configuration is missing', () => {
    expect(() => requireSpreadsheetId({})).toThrow('TRADING_COCKPIT_SPREADSHEET_ID is required');
  });

  it('loads production startup configuration from Cloud Run compatible environment variables', () => {
    expect(
      loadConfig({
        TRADING_COCKPIT_SPREADSHEET_ID: 'spreadsheet-id',
        TRADING_COCKPIT_GOOGLE_CLIENT_ID: 'google-client-id',
        TRADING_COCKPIT_ALLOWED_EMAILS: 'trader@example.com,admin@example.com',
        TRADING_COCKPIT_ALLOWED_ORIGINS: 'https://cockpit.example.com',
        TRADING_COCKPIT_WEB_DIST_DIR: '/app/web/dist',
        PORT: '9090'
      })
    ).toEqual({
      spreadsheetId: 'spreadsheet-id',
      port: 9090,
      staticAssetsPath: '/app/web/dist',
      auth: {
        googleClientId: 'google-client-id',
        allowedEmails: ['trader@example.com', 'admin@example.com']
      },
      cors: {
        allowedOrigins: ['https://cockpit.example.com']
      }
    });
    expect(
      loadConfig({
        TRADING_COCKPIT_SPREADSHEET_ID: 'spreadsheet-id',
        TRADING_COCKPIT_GOOGLE_CLIENT_ID: 'google-client-id',
        TRADING_COCKPIT_ALLOWED_EMAILS: 'trader@example.com',
        TRADING_COCKPIT_ALLOWED_ORIGINS: 'https://cockpit.example.com'
      }).port
    ).toBe(8080);
  });

  it('requires Authorization for /api/watchlist', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/watchlist',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required.' });
  });

  it('rejects malformed or invalid bearer tokens', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/watchlist',
      headers: { authorization: 'Bearer invalid-token' },
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: {
        verify: vi.fn(async () => {
          throw new Error('bad token');
        })
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required.' });
  });

  it('rejects valid Google users outside the email allowlist', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/watchlist',
      headers: authorizationHeaders(),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: authorizedTokenVerifier({ email: 'other@example.com' })
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden.' });
  });

  it('passes authorized principals to the protected Watchlist handler', async () => {
    const verifier = authorizedTokenVerifier();
    const client = sheetsClient([
      [...WATCHLIST_HEADERS],
      rowFor({
        'Watchlist ID': 'W1',
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Strategy: 'Momentum Breakout',
        'Strategy Version': '1.0',
        'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
        Ticker: 'BOX',
        Status: 'READY'
      })
    ]);

    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/watchlist',
      headers: authorizationHeaders(),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: verifier,
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(response.statusCode).toBe(200);
    expect(verifier.verify).toHaveBeenCalledWith('valid-token', 'google-client-id');
    expect(client.getValues).toHaveBeenCalledTimes(1);
  });

  it('adds CORS headers for allowed origins', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://cockpit.example.com' },
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('https://cockpit.example.com');
    expect(response.headers.Vary).toBe('Origin');
  });

  it('rejects disallowed CORS origins before authentication', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const verifier = authorizedTokenVerifier();
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/watchlist',
      headers: {
        ...authorizationHeaders(),
        origin: 'https://evil.example.com'
      },
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClient([]),
      tokenVerifier: verifier
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: 'Origin is not allowed.' });
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('serves OPTIONS preflight for allowed origins without accessing Google Sheets', async () => {
    const sheetsClientFactory = vi.fn(async () => sheetsClient([]));
    const response = await handleCloudRunRequest({
      method: 'OPTIONS',
      url: '/api/watchlist',
      headers: { origin: 'https://cockpit.example.com' },
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory,
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBeNull();
    expect(response.headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(response.headers['Access-Control-Allow-Headers']).toContain('Authorization');
    expect(sheetsClientFactory).not.toHaveBeenCalled();
  });

  it('requires authentication for mutation routes before parsing or writing', async () => {
    const client = mutableSheetsClientByRange(queryFixtureByRange());
    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/trade-plans',
      body: JSON.stringify({ watchlistId: 'W1', accountId: 'A1', invalidationLevel: 30 }),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(401);
    expect(client.appendValues).not.toHaveBeenCalled();
  });

  it('rejects malformed mutation JSON with a safe 400', async () => {
    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/trade-plans',
      headers: authorizationHeaders(),
      body: '{bad json',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => mutableSheetsClientByRange(queryFixtureByRange()),
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: 'Malformed JSON request body.' });
  });

  it('rejects mutation path/body identity mismatches before writing', async () => {
    const client = mutableSheetsClientByRange(queryFixtureByRange());

    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/trade-plans/TP-1/execute',
      headers: authorizationHeaders(),
      body: JSON.stringify({ tradePlanId: 'TP-2' }),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'tradePlanId in request body does not match URL path.'
    });
    expect(client.appendValues).not.toHaveBeenCalled();
    expect(client.updateValues).not.toHaveBeenCalled();
    expect(client.batchUpdateValues).not.toHaveBeenCalled();
  });

  it('creates a Trade Plan through backend-core and writes Trade Plans plus Watchlist status', async () => {
    const fixture = queryFixtureByRange({
      tradePlans: [],
      positions: [],
      journal: []
    });
    const client = mutableSheetsClientByRange(fixture);

    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/trade-plans',
      headers: authorizationHeaders(),
      body: JSON.stringify({
        watchlistId: 'W1',
        accountId: 'A1',
        breakoutLevel: 35,
        invalidationLevel: 30,
        eventRisk: 'CLEAR'
      }),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier(),
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        kind: 'created',
        watchlistId: 'W1',
        ticker: 'BOX',
        accountId: 'A1',
        status: 'DRAFT'
      })
    );
    expect(client.appendValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Trade Plans'!A:AD" })
    );
    expect(client.batchUpdateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ range: "'Watchlist'!P2" }),
          expect.objectContaining({ range: "'Watchlist'!R2" }),
          expect.objectContaining({ range: "'Watchlist'!T2" })
        ])
      })
    );
    expect(client.updateValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Watchlist'!N2", values: [['PLANNED']] })
    );
  });

  it('updates Trade Plan planning using backend calculations and row formulas', async () => {
    const client = mutableSheetsClientByRange(queryFixtureByRange({ positions: [] }));

    const response = await handleCloudRunRequest({
      method: 'PATCH',
      url: '/api/trade-plans/TP-1/planning',
      headers: authorizationHeaders(),
      body: JSON.stringify({
        entryPrice: 34,
        stopPrice: 30,
        targetPrice: 42,
        positionSize: null
      }),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ tradePlanId: 'TP-1', status: 'READY' });
    expect(client.batchUpdateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            range: "'Trade Plans'!Q2:AA2",
            values: [expect.arrayContaining(['=IF(OR(Q2="",R2=""),"",Q2-R2)'])]
          })
        ]
      })
    );
  });

  it('executes an eligible Trade Plan and writes Position, Trade Plan status and Watchlist status', async () => {
    const client = mutableSheetsClientByRange(queryFixtureByRange({ positions: [] }));

    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/trade-plans/TP-1/execute',
      headers: authorizationHeaders(),
      body: JSON.stringify({}),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier(),
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        kind: 'opened',
        tradePlanId: 'TP-1',
        accountId: 'A1',
        ticker: 'BOX',
        positionStatus: 'OPEN'
      })
    );
    expect(client.appendValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Positions'!A:Z" })
    );
    expect(client.updateValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Trade Plans'!AB2", values: [['EXECUTED']] })
    );
    expect(client.updateValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Watchlist'!N2", values: [['ENTERED']] })
    );
  });

  it('closes a Position and writes Position, Journal and Watchlist updates', async () => {
    const client = mutableSheetsClientByRange(queryFixtureByRange({ journal: [] }));

    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/positions/P-1/close',
      headers: authorizationHeaders(),
      body: JSON.stringify({ exitPrice: 36 }),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier(),
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        positionId: 'P-1',
        status: 'CLOSED',
        exitPrice: 36,
        journalCreated: true
      })
    );
    expect(client.batchUpdateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ range: "'Positions'!U2:X2" })]
      })
    );
    expect(client.appendValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Journal'!A:AA" })
    );
    expect(client.updateValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Watchlist'!N2", values: [['CLOSED']] })
    );
  });

  it('records a capital transaction through backend-core and appends to Capital Ledger', async () => {
    const client = mutableSheetsClientByRange(queryFixtureByRange({ capitalLedger: [] }));

    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/admin/capital-transactions',
      headers: authorizationHeaders(),
      body: JSON.stringify({
        accountId: 'A1',
        type: 'DEPOSIT',
        amount: 500,
        note: 'Top up'
      }),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier(),
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        accountId: 'A1',
        type: 'DEPOSIT',
        amount: 500,
        note: 'Top up'
      })
    );
    expect(client.appendValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Capital Ledger'!A:F" })
    );
  });

  it('sets up Trading Accounts sheets with headers without exposing Sheets UI behavior', async () => {
    const client = mutableSheetsClientByRange(queryFixtureByRange());

    const response = await handleCloudRunRequest({
      method: 'POST',
      url: '/api/admin/trading-accounts/setup',
      headers: authorizationHeaders(),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(200);
    expect(client.updateValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Accounts'!A1:D1" })
    );
    expect(client.updateValues).toHaveBeenCalledWith(
      expect.objectContaining({ range: "'Capital Ledger'!A1:F1" })
    );
  });

  it('serves all migrated query routes behind authentication', async () => {
    const client = sheetsClientByRange(queryFixtureByRange());
    const routes = [
      '/api/dashboard',
      '/api/dashboard/summary',
      '/api/discovery/momentum-ranking',
      '/api/trade-plans',
      '/api/positions/open',
      '/api/journal',
      '/api/analytics',
      '/api/admin/trading-accounts',
      '/api/admin/trading-config',
      '/api/admin/strategies/validation'
    ];

    for (const route of routes) {
      const response = await handleCloudRunRequest({
        method: 'GET',
        url: route,
        headers: authorizationHeaders(),
        spreadsheetId: 'spreadsheet-id',
        auth: testAuthConfig(),
        cors: testCorsConfig(),
        sheetsClientFactory: async () => client,
        tokenVerifier: authorizedTokenVerifier(),
        now: () => new Date('2026-08-28T16:04:00.000Z')
      });

      expect(response.statusCode, route).toBe(200);
      expect(response.headers['Server-Timing'], route).toContain('sheets;dur=');
    }
  });

  it('requires authentication for migrated query routes', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/journal',
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClientByRange(queryFixtureByRange()),
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(401);
  });

  it('uses batchGet for composite Dashboard data and reuses loaded tables within the request', async () => {
    const client = sheetsClientByRange(queryFixtureByRange());

    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/dashboard',
      headers: authorizationHeaders(),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => client,
      tokenVerifier: authorizedTokenVerifier(),
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(response.statusCode).toBe(200);
    expect(client.batchGetValues).toHaveBeenCalledTimes(1);
    expect(client.getValues).not.toHaveBeenCalled();
    expect(response.body).toEqual(
      expect.objectContaining({
        generatedAt: '2026-08-28T16:04:00.000Z',
        pipeline: expect.objectContaining({
          signals: 1,
          watchlist: 1,
          activeTradePlans: 1,
          openPositions: 1,
          closedTrades: 1
        })
      })
    );
  });

  it('reports Finviz auth status without exposing the token value', async () => {
    const response = await handleCloudRunRequest({
      method: 'GET',
      url: '/api/admin/finviz/auth',
      headers: authorizationHeaders(),
      spreadsheetId: 'spreadsheet-id',
      auth: testAuthConfig(),
      cors: testCorsConfig(),
      sheetsClientFactory: async () => sheetsClientByRange(queryFixtureByRange()),
      tokenVerifier: authorizedTokenVerifier()
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ configured: false });
  });
});

async function createWebDistFixture(): Promise<string> {
  const webDistPath = await mkdtemp(join(tmpdir(), 'trading-cockpit-web-dist-'));
  await mkdir(join(webDistPath, 'assets'));
  await writeFile(
    join(webDistPath, 'index.html'),
    '<!doctype html><div id="root"></div><script type="module" src="/assets/app.js"></script>'
  );
  await writeFile(join(webDistPath, 'assets', 'app.js'), 'console.log("cockpit");');
  return webDistPath;
}

function queryFixtureByRange(
  overrides: {
    tradePlans?: unknown[][];
    positions?: unknown[][];
    journal?: unknown[][];
    capitalLedger?: unknown[][];
  } = {}
): Record<string, unknown[][]> {
  const tradePlanHeaders = [...SHEET_DEFINITIONS.tradePlans.requiredHeaders];
  const positionHeaders = [...SHEET_DEFINITIONS.positions.requiredHeaders];
  const journalHeaders = [...SHEET_DEFINITIONS.journal.requiredHeaders];
  const accountHeaders = [...SHEET_DEFINITIONS.accounts.requiredHeaders];
  const strategyHeaders = [...SHEET_DEFINITIONS.strategies.requiredHeaders];
  const momentumHeaders = [...SHEET_DEFINITIONS.momentumRanking.requiredHeaders];
  const capitalLedgerHeaders = [
    'Transaction ID',
    'Account ID',
    'Type',
    'Amount',
    'Occurred At',
    'Note'
  ];

  return {
    [SHEET_DEFINITIONS.watchlist.range]: [
      [...WATCHLIST_HEADERS],
      rowFor({
        'Watchlist ID': 'W1',
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Strategy: 'Momentum Breakout',
        'Strategy Version': '1.0',
        'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
        Ticker: 'BOX',
        'Current Price': 34,
        'Signal Price': 33,
        'Momentum Score': 87,
        'Breakout Level': 35,
        'Distance to Breakout': -0.01,
        Status: 'READY',
        'Setup Status': 'CONFIRMED'
      })
    ],
    [SHEET_DEFINITIONS.tradePlans.range]: [
      tradePlanHeaders,
      ...(overrides.tradePlans ?? [
        rowForHeaders(tradePlanHeaders, {
          'Trade Plan ID': 'TP-1',
          'Watchlist ID': 'W1',
          'Strategy ID': 'MOMENTUM_BREAKOUT',
          Strategy: 'Momentum Breakout',
          'Strategy Version': '1.0',
          'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
          Ticker: 'BOX',
          'Created At': sheetsSerialDate('2026-08-27T14:00:00.000Z'),
          'Entry Price': 34,
          'Stop Price': 30,
          'Target Price': 42,
          'Account Equity': 20000,
          'Risk %': 0.005,
          'Max Risk $': 100,
          'Position Size': 25,
          Status: 'READY',
          'Account ID': 'A1'
        })
      ])
    ],
    [SHEET_DEFINITIONS.positions.range]: [
      positionHeaders,
      ...(overrides.positions ?? [
        rowForHeaders(positionHeaders, {
          'Position ID': 'P-1',
          'Trade Plan ID': 'TP-1',
          'Watchlist ID': 'W1',
          'Strategy ID': 'MOMENTUM_BREAKOUT',
          Strategy: 'Momentum Breakout',
          'Strategy Version': '1.0',
          Ticker: 'BOX',
          'Opened At': sheetsSerialDate('2026-08-27T15:00:00.000Z'),
          'Actual Entry': 34,
          'Actual Quantity': 25,
          'Current Stop': 30,
          Target: 42,
          'Current Price': 36,
          'Unrealized P&L': 50,
          'Unrealized P&L %': 0.05,
          Status: 'OPEN',
          'Account ID': 'A1'
        })
      ])
    ],
    [SHEET_DEFINITIONS.journal.range]: [
      journalHeaders,
      ...(overrides.journal ?? [
        rowForHeaders(journalHeaders, {
          'Journal ID': 'J-1',
          'Position ID': 'P-CLOSED',
          'Trade Plan ID': 'TP-CLOSED',
          'Watchlist ID': 'W-CLOSED',
          'Strategy ID': 'MOMENTUM_BREAKOUT',
          Strategy: 'Momentum Breakout',
          'Strategy Version': '1.0',
          Ticker: 'DK',
          'Opened At': sheetsSerialDate('2026-08-20T15:00:00.000Z'),
          'Closed At': sheetsSerialDate('2026-08-25T15:00:00.000Z'),
          'Actual Entry': 20,
          'Exit Price': 24,
          Quantity: 10,
          'Realized P&L': 40,
          'R-Multiple': 2,
          Outcome: 'WIN',
          'Account ID': 'A1'
        })
      ])
    ],
    ["'Capital Ledger'!A:F"]: [
      capitalLedgerHeaders,
      ...(overrides.capitalLedger ?? [
        rowForHeaders(capitalLedgerHeaders, {
          'Transaction ID': 'CL-1',
          'Account ID': 'A1',
          Type: 'INITIAL_FUNDING',
          Amount: 20000,
          'Occurred At': sheetsSerialDate('2026-08-01T12:00:00.000Z'),
          Note: 'Initial'
        })
      ])
    ],
    [SHEET_DEFINITIONS.accounts.range]: [
      accountHeaders,
      rowForHeaders(accountHeaders, {
        'Account ID': 'A1',
        Name: 'Main Account',
        'Base Currency': 'CAD',
        'Risk % Per Trade': 0.005
      })
    ],
    [SHEET_DEFINITIONS.strategies.range]: [
      strategyHeaders,
      rowForHeaders(strategyHeaders, {
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Name: 'Momentum Breakout',
        Version: '1.0',
        Type: 'MOMENTUM',
        Enabled: true,
        'Risk %': 0.005,
        'Max Positions': 5,
        Description: 'Momentum breakout near 52-week high'
      })
    ],
    [SHEET_DEFINITIONS.momentumRanking.range]: [
      momentumHeaders,
      rowForHeaders(momentumHeaders, {
        Rank: 1,
        'Strategy ID': 'MOMENTUM_BREAKOUT',
        Strategy: 'Momentum Breakout',
        'Strategy Version': '1.0',
        'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
        Ticker: 'BOX',
        Company: 'Box Inc',
        Sector: 'Technology',
        Price: 34,
        '52W High': 36,
        '52W Score': 20,
        'Relative Volume': 1.5,
        'RelVol Score': 20,
        'Performance Month': 0.12,
        'Performance Score': 20,
        RSI: 60,
        'RSI Score': 15,
        SMA20: 32,
        'SMA20 Score': 12,
        'Momentum Score': 87,
        'Review Status': 'REVIEW'
      })
    ],
    [SHEET_DEFINITIONS.cockpitConfig.range]: [
      ['Parameter', 'Value', 'Description'],
      ['Account Name', 'Trading', 'Nom du compte utilisé pour le trading actif'],
      ['Account Equity', 20000, 'Valeur actuelle du compte utilisée pour le position sizing'],
      ['Default Risk %', 0.005, 'Risque maximal par trade'],
      ['Max Position %', 0.1, 'Exposition maximale recommandée par position'],
      ['Currency', 'CAD', 'Devise du compte']
    ]
  };
}
