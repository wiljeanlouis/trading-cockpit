import { describe, expect, it, vi } from 'vitest';
import type { SheetsValuesClient } from '../../src/adapters/outbound/google-sheets-api/google-sheets-api-client';
import { createRequestScopedSheets } from '../../src/adapters/outbound/google-sheets-api/sheets-api-table';
import {
  CloudRunJournalRepository,
  CloudRunMarketSignalProjection,
  CloudRunPositionRepository,
  CloudRunSignalHistoryRepository,
  CloudRunTradePlanRepository,
  CloudRunWatchlistRepository,
  DeferredSheetsWriter,
  type MutationContext
} from '../../src/adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import {
  SHEET_DEFINITIONS,
  WATCHLIST_HEADERS
} from '../../src/adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { TradePlan } from '@trading-cockpit/core/domain/trade-plan';
import type { Position } from '@trading-cockpit/core/domain/position';
import type { JournalEntry } from '@trading-cockpit/core/domain/journal-entry';
import {
  FINVIZ_MOMENTUM_EXPORT_HEADERS,
  SIGNALS_HISTORY_HEADERS
} from '@trading-cockpit/contracts';

const MS_PER_DAY = 86_400_000;
const SHEETS_SERIAL_EPOCH_OFFSET = 25569;

function sheetsSerialDate(isoDate: string): number {
  return new Date(isoDate).getTime() / MS_PER_DAY + SHEETS_SERIAL_EPOCH_OFFSET;
}

function rowFor(headers: readonly string[], values: Record<string, unknown>): unknown[] {
  return headers.map((header) => values[header] ?? '');
}

function mutableClient(valuesByRange: Record<string, unknown[][]>): SheetsValuesClient {
  return {
    getValues: vi.fn(async ({ range }: { range: string }) => ({
      values: valuesByRange[range] ?? []
    })),
    batchGetValues: vi.fn(async ({ ranges }) =>
      Object.fromEntries(
        ranges.map((range: string) => [range, { values: valuesByRange[range] ?? [] }])
      )
    ),
    appendValues: vi.fn(async () => undefined),
    updateValues: vi.fn(async () => undefined),
    batchUpdateValues: vi.fn(async () => undefined)
  };
}

function mutationContext(client: SheetsValuesClient): MutationContext {
  return {
    sheets: createRequestScopedSheets({ sheetsClient: client, spreadsheetId: 'spreadsheet-id' }),
    writer: new DeferredSheetsWriter({ sheetsClient: client, spreadsheetId: 'spreadsheet-id' }),
    now: () => new Date('2026-08-28T16:04:00.000Z')
  };
}

function tradePlanRows(overrides: Record<string, unknown> = {}) {
  const headers = SHEET_DEFINITIONS.tradePlans.requiredHeaders;
  return [
    [...headers],
    rowFor(headers, {
      'Trade Plan ID': 'TP-1',
      'Watchlist ID': 'W1',
      'Strategy ID': 'MOMENTUM_BREAKOUT',
      Strategy: 'Momentum Breakout',
      'Strategy Version': 'V1',
      'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
      Ticker: 'BOX',
      'Entry Price': 34,
      'Stop Price': 30,
      'Target Price': 42,
      'Risk / Share': 4,
      'Reward / Share': 8,
      'Risk : Reward': 2,
      'Account Equity': 20_000,
      'Risk %': 0.005,
      'Max Risk $': 100,
      'Position Size': 25,
      'Position Value': 850,
      Status: 'READY',
      'Account ID': 'A1',
      ...overrides
    })
  ];
}

function positionRows(overrides: Record<string, unknown> = {}) {
  const headers = SHEET_DEFINITIONS.positions.requiredHeaders;
  return [
    [...headers],
    rowFor(headers, {
      'Position ID': 'P-1',
      'Trade Plan ID': 'TP-1',
      'Watchlist ID': 'W1',
      'Strategy ID': 'MOMENTUM_BREAKOUT',
      Strategy: 'Momentum Breakout',
      'Strategy Version': 'V1',
      Ticker: 'BOX',
      'Opened At': sheetsSerialDate('2026-08-28T14:30:00.000Z'),
      'Planned Entry': 34,
      'Actual Entry': 34,
      'Actual Quantity': 25,
      'Initial Stop': 30,
      'Current Stop': 30,
      Target: 42,
      'Planned Max Risk': 100,
      'Planned R:R': 2,
      Status: 'OPEN',
      'Account ID': 'A1',
      ...overrides
    })
  ];
}

describe('Cloud Run Google Sheets API mutation repositories', () => {
  it('serializes deferred writes with USER_ENTERED values, dates and blanks', async () => {
    const client = mutableClient({});
    const writer = new DeferredSheetsWriter({
      sheetsClient: client,
      spreadsheetId: 'spreadsheet-id'
    });

    writer.append("'Journal'!A:AA", [
      ['J1', new Date('2026-08-28T16:04:00.000Z'), null, undefined]
    ]);
    await writer.flush();

    expect(client.appendValues).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      range: "'Journal'!A:AA",
      values: [['J1', '2026-08-28 16:04:00', '', '']],
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS'
    });
  });

  it('updates Watchlist status through the status column only', async () => {
    const client = mutableClient({
      [SHEET_DEFINITIONS.watchlist.range]: [
        [...WATCHLIST_HEADERS],
        rowFor(WATCHLIST_HEADERS, {
          'Watchlist ID': 'W1',
          'Strategy ID': 'MOMENTUM_BREAKOUT',
          Strategy: 'Momentum Breakout',
          'Strategy Version': 'V1',
          Ticker: 'BOX',
          Status: 'WATCHING'
        })
      ]
    });
    const context = mutationContext(client);
    const repository = await new CloudRunWatchlistRepository(context).load();

    repository.updateStatus('W1', 'PLANNED');
    await context.writer.flush();

    expect(client.updateValues).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      range: "'Watchlist'!N2",
      values: [['PLANNED']],
      valueInputOption: 'USER_ENTERED'
    });
  });

  it('writes Trade Plan planning cells and preserves existing Sheet formulas', async () => {
    const client = mutableClient({
      [SHEET_DEFINITIONS.tradePlans.range]: tradePlanRows()
    });
    const context = mutationContext(client);
    const repository = await new CloudRunTradePlanRepository(context).load();
    const plan = repository.findById('TP-1');
    if (!plan) throw new Error('fixture missing TP-1');

    repository.updatePlanning(
      {
        ...plan,
        entryPrice: 34,
        stopPrice: 30,
        targetPrice: 42,
        riskPerShare: 4,
        rewardPerShare: 8,
        riskReward: 2,
        maxRisk: 100,
        positionSize: 25,
        positionValue: 850,
        status: 'READY'
      } satisfies TradePlan,
      { positionSizeOverridden: false }
    );
    await context.writer.flush();

    expect(client.batchUpdateValues).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      data: [
        {
          range: "'Trade Plans'!Q2:AA2",
          values: [
            [
              34,
              30,
              42,
              '=IF(OR(Q2="",R2=""),"",Q2-R2)',
              '=IF(OR(Q2="",S2=""),"",S2-Q2)',
              '=IF(OR(T2="",T2<=0,U2=""),"",U2/T2)',
              20_000,
              0.005,
              '=IF(OR(W2="",X2=""),"",W2*X2)',
              '=IF(OR(Y2="",T2="",T2<=0),"",FLOOR(Y2/T2,1))',
              '=IF(OR(Z2="",Q2=""),"",Z2*Q2)'
            ]
          ]
        }
      ],
      valueInputOption: 'USER_ENTERED'
    });
  });

  it('supports explicit Trade Plan position-size overrides without replacing them with formulas', async () => {
    const client = mutableClient({
      [SHEET_DEFINITIONS.tradePlans.range]: tradePlanRows()
    });
    const context = mutationContext(client);
    const repository = await new CloudRunTradePlanRepository(context).load();
    const plan = repository.findById('TP-1');
    if (!plan) throw new Error('fixture missing TP-1');

    repository.updatePlanning(
      { ...plan, positionSize: 12, positionValue: 408 } satisfies TradePlan,
      { positionSizeOverridden: true }
    );
    await context.writer.flush();

    expect(client.batchUpdateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            range: "'Trade Plans'!Q2:AA2",
            values: [expect.arrayContaining([12, 408])]
          })
        ]
      })
    );
  });

  it('closes Positions by updating only the status/close execution range', async () => {
    const client = mutableClient({
      [SHEET_DEFINITIONS.positions.range]: positionRows()
    });
    const context = mutationContext(client);
    const repository = await new CloudRunPositionRepository(context).load();
    const position = repository.findById('P-1');
    if (!position) throw new Error('fixture missing P-1');

    repository.close({
      ...position,
      status: 'CLOSED',
      closedAt: new Date('2026-08-29T16:04:00.000Z'),
      exitPrice: 36,
      realizedPnl: 50
    } satisfies Position);
    await context.writer.flush();

    expect(client.batchUpdateValues).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      data: [
        {
          range: "'Positions'!U2:X2",
          values: [['CLOSED', '2026-08-29 16:04:00', 36, 50]]
        }
      ],
      valueInputOption: 'USER_ENTERED'
    });
  });

  it('appends Journal entries with formulas owned by the Google Sheets adapter', async () => {
    const client = mutableClient({
      [SHEET_DEFINITIONS.journal.range]: [[...SHEET_DEFINITIONS.journal.requiredHeaders]]
    });
    const context = mutationContext(client);
    const repository = await new CloudRunJournalRepository(context).load();

    repository.save({
      id: 'J-1',
      positionId: 'P-1',
      tradePlanId: 'TP-1',
      watchlistId: 'W1',
      accountId: 'A1',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      ticker: 'BOX',
      openedAt: new Date('2026-08-28T14:30:00.000Z'),
      closedAt: new Date('2026-08-29T14:30:00.000Z'),
      plannedEntry: 34,
      actualEntry: 34,
      exitPrice: 36,
      quantity: 25,
      initialStop: 30,
      target: 42,
      plannedMaxRisk: 100,
      plannedRiskReward: 2,
      realizedPnl: 50,
      returnPercent: null,
      rMultiple: null,
      outcome: null,
      exitReason: 'MANUAL',
      executionNotes: '',
      lessonsLearned: '',
      followedPlan: ''
    } satisfies JournalEntry);
    await context.writer.flush();

    expect(client.appendValues).toHaveBeenCalledWith(
      expect.objectContaining({
        range: "'Journal'!A:AA",
        values: [
          expect.arrayContaining([
            'J-1',
            'P-1',
            'TP-1',
            'W1',
            'MOMENTUM_BREAKOUT',
            'Momentum Breakout',
            'V1',
            'BOX',
            '2026-08-28 14:30:00',
            '2026-08-29 14:30:00',
            34,
            34,
            36,
            25,
            30,
            42,
            100,
            2,
            50,
            '=IF(OR(L2="",M2=""),"",M2/L2-1)',
            '=IF(OR(Q2="",Q2<=0,S2=""),"",S2/Q2)',
            '=IF(S2="","",IF(S2>0,"WIN",IF(S2<0,"LOSS","BREAKEVEN")))'
          ])
        ],
        valueInputOption: 'USER_ENTERED'
      })
    );
  });

  it('projects Finviz signals as a deterministic row-1 technical table', async () => {
    const client = mutableClient({});
    const context = mutationContext(client);

    new CloudRunMarketSignalProjection(context).replace(
      {
        feed: {
          id: 'MOMENTUM_BREAKOUT_V1',
          strategyId: 'MOMENTUM_BREAKOUT',
          strategyName: 'Momentum Breakout',
          strategyVersion: 'V1'
        },
        attributeNames: ['Ticker', 'Company', 'Price'],
        signals: [
          {
            ticker: 'BOX',
            attributes: {
              Ticker: 'BOX',
              Company: 'Box Inc',
              Price: 34.98
            }
          }
        ]
      },
      new Date('2026-08-28T16:04:00.000Z')
    );
    await context.writer.flush();

    expect(client.updateValues).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      range: "'Finviz - Momentum'!A1:Z",
      values: [
        [
          'Strategy ID',
          'Strategy',
          'Strategy Version',
          'Refreshed At',
          'Ticker',
          'Company',
          'Price'
        ],
        [
          'MOMENTUM_BREAKOUT',
          'Momentum Breakout',
          'V1',
          '2026-08-28 16:04:00',
          'BOX',
          'Box Inc',
          34.98
        ]
      ],
      valueInputOption: 'USER_ENTERED'
    });
  });

  it('archives Signals History rows against the complete canonical schema', async () => {
    const client = mutableClient({});
    const context = mutationContext(client);

    new CloudRunSignalHistoryRepository(context).append([
      {
        signalDate: '2026-08-28',
        detectedAt: new Date('2026-08-28T16:04:00.000Z'),
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyName: 'Momentum Breakout',
        strategyVersion: 'V1',
        ticker: 'BOX',
        attributes: Object.fromEntries(
          FINVIZ_MOMENTUM_EXPORT_HEADERS.map((header) => [
            header,
            header === 'Ticker'
              ? 'BOX'
              : header === 'Company'
                ? 'Box Inc'
                : header === 'Sector'
                  ? 'Technology'
                  : header === 'Average Volume'
                    ? 1_000_000
                    : header === 'Price'
                      ? 34.98
                      : `${header} value`
          ])
        )
      }
    ]);
    await context.writer.flush();

    const appendValues = vi.mocked(client.appendValues!);
    expect(appendValues).toHaveBeenCalled();
    const request = appendValues.mock.calls[0]?.[0];
    expect(request).toEqual(
      expect.objectContaining({
        spreadsheetId: 'spreadsheet-id',
        range: SHEET_DEFINITIONS.signalsHistory.range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS'
      })
    );
    expect(request?.values[0]).toHaveLength(SIGNALS_HISTORY_HEADERS.length);
    expect(new Set(SIGNALS_HISTORY_HEADERS).size).toBe(SIGNALS_HISTORY_HEADERS.length);
    expect(request?.values[0]?.[SIGNALS_HISTORY_HEADERS.indexOf('Ticker')]).toBe('BOX');
    expect(request?.values[0]?.[SIGNALS_HISTORY_HEADERS.indexOf('Finviz Ticker')]).toBe('BOX');
    expect(request?.values[0]?.[SIGNALS_HISTORY_HEADERS.indexOf('Average Volume')]).toBe(1_000_000);
    expect(request?.values[0]?.[SIGNALS_HISTORY_HEADERS.indexOf('Earnings Date')]).toBe(
      'Earnings Date value'
    );
  });

  it('rejects unsupported signal attributes before writing beyond canonical headers', () => {
    const client = mutableClient({});
    const context = mutationContext(client);
    const repository = new CloudRunSignalHistoryRepository(context);

    expect(() => repository.ensureReady([...FINVIZ_MOMENTUM_EXPORT_HEADERS, 'Unexpected'])).toThrow(
      'Signals History attribut non supporté : Unexpected'
    );
    expect(client.appendValues).not.toHaveBeenCalled();
  });
});
