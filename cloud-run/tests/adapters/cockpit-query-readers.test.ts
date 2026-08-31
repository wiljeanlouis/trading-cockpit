import { describe, expect, it, vi } from 'vitest';
import type { SheetsValuesClient } from '../../src/adapters/outbound/google-sheets-api/google-sheets-api-client';
import {
  readJournalEntries,
  readMomentumRankingRecords,
  readPositions,
  readTradePlans,
  readTradingConfig,
  readTradingAccounts,
  readWatchlistEntries,
  SHEET_DEFINITIONS,
  WATCHLIST_HEADERS
} from '../../src/adapters/outbound/google-sheets-api/cockpit-query-readers';
import { createRequestScopedSheets } from '../../src/adapters/outbound/google-sheets-api/sheets-api-table';

const MS_PER_DAY = 86_400_000;
const SHEETS_SERIAL_EPOCH_OFFSET = 25569;

function sheetsSerialDate(isoDate: string): number {
  return new Date(isoDate).getTime() / MS_PER_DAY + SHEETS_SERIAL_EPOCH_OFFSET;
}

function rowFor(headers: readonly string[], values: Record<string, unknown>): unknown[] {
  return headers.map((header) => values[header] ?? '');
}

function clientWith(valuesByRange: Record<string, unknown[][]>): SheetsValuesClient {
  return {
    getValues: vi.fn(async ({ range }) => ({ values: valuesByRange[range] ?? [] }))
  };
}

function sheets(valuesByRange: Record<string, unknown[][]>) {
  return createRequestScopedSheets({
    sheetsClient: clientWith(valuesByRange),
    spreadsheetId: 'spreadsheet-id'
  });
}

describe('Cloud Run Google Sheets API query readers', () => {
  it('maps Watchlist rows from the consolidated reader schema', async () => {
    const entries = await readWatchlistEntries(
      sheets({
        [SHEET_DEFINITIONS.watchlist.range]: [
          [...WATCHLIST_HEADERS],
          rowFor(WATCHLIST_HEADERS, {
            'Watchlist ID': 'W1',
            'Strategy ID': 'momentum_breakout',
            Strategy: 'Momentum Breakout',
            'Strategy Version': 'V1',
            'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
            Ticker: 'BOX',
            Company: 'Box Inc',
            Sector: 'Technology',
            'Current Price': 34.82,
            'Momentum Score': 87,
            Status: 'WATCHING'
          })
        ]
      })
    );

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'W1',
        strategyId: 'momentum_breakout',
        ticker: 'BOX',
        currentPrice: 34.82,
        momentumScore: 87,
        status: 'WATCHING'
      })
    ]);
    expect(entries[0].signalDate).toBeInstanceOf(Date);
  });

  it('maps Trade Plan rows including account attribution and backend-provided calculations', async () => {
    const headers = SHEET_DEFINITIONS.tradePlans.requiredHeaders;
    const plans = await readTradePlans(
      sheets({
        [SHEET_DEFINITIONS.tradePlans.range]: [
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
            'Account ID': 'a1'
          })
        ]
      })
    );

    expect(plans).toEqual([
      expect.objectContaining({
        id: 'TP-1',
        accountId: 'A1',
        ticker: 'BOX',
        entryPrice: 34,
        stopPrice: 30,
        targetPrice: 42,
        riskReward: 2,
        status: 'READY'
      })
    ]);
  });

  it('rejects Trade Plan sheets missing the current Account ID column', async () => {
    const headers = SHEET_DEFINITIONS.tradePlans.requiredHeaders.filter(
      (header) => header !== 'Account ID'
    );

    await expect(
      readTradePlans(
        sheets({
          [SHEET_DEFINITIONS.tradePlans.range]: [[...headers]]
        })
      )
    ).rejects.toThrow('Trade Plans est incomplet : colonne Account ID absente.');
  });

  it('maps Position rows while preserving formula-backed values as snapshots', async () => {
    const headers = SHEET_DEFINITIONS.positions.requiredHeaders;
    const positions = await readPositions(
      sheets({
        [SHEET_DEFINITIONS.positions.range]: [
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
            'Actual Entry': 34.1,
            'Actual Quantity': 25,
            'Initial Stop': 30,
            'Current Stop': 31,
            Target: 42,
            'Current Price': 35,
            'Unrealized P&L': 22.5,
            Status: 'OPEN',
            'Account ID': 'a1'
          })
        ]
      })
    );

    expect(positions).toEqual([
      expect.objectContaining({
        id: 'P-1',
        accountId: 'A1',
        ticker: 'BOX',
        actualEntry: 34.1,
        currentPrice: 35,
        unrealizedPnl: 22.5,
        status: 'OPEN'
      })
    ]);
    expect(positions[0].openedAt).toBeInstanceOf(Date);
  });

  it('maps Journal rows with outcome and account attribution', async () => {
    const headers = SHEET_DEFINITIONS.journal.requiredHeaders;
    const entries = await readJournalEntries(
      sheets({
        [SHEET_DEFINITIONS.journal.range]: [
          [...headers],
          rowFor(headers, {
            'Journal ID': 'J-1',
            'Position ID': 'P-1',
            'Trade Plan ID': 'TP-1',
            'Watchlist ID': 'W1',
            'Strategy ID': 'MOMENTUM_BREAKOUT',
            Strategy: 'Momentum Breakout',
            'Strategy Version': 'V1',
            Ticker: 'BOX',
            'Opened At': sheetsSerialDate('2026-08-28T14:30:00.000Z'),
            'Closed At': sheetsSerialDate('2026-08-29T14:30:00.000Z'),
            'Actual Entry': 34,
            'Exit Price': 36,
            Quantity: 25,
            'Realized P&L': 50,
            'Return %': 0.0588,
            'R-Multiple': 0.5,
            Outcome: 'WIN',
            'Account ID': 'a1'
          })
        ]
      })
    );

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'J-1',
        positionId: 'P-1',
        accountId: 'A1',
        ticker: 'BOX',
        realizedPnl: 50,
        rMultiple: 0.5,
        outcome: 'WIN'
      })
    ]);
  });

  it('reads normalized Cockpit Config rows directly from row 2+', async () => {
    const config = await readTradingConfig(
      sheets({
        [SHEET_DEFINITIONS.cockpitConfig.range]: [
          ['Parameter', 'Value', 'Description'],
          ['Account Name', 'Trading', 'Nom du compte'],
          ['Account Equity', 20_000, 'Legacy display value'],
          ['Default Risk %', 0.005, 'Legacy display value'],
          ['Max Position %', 0.1, 'Legacy display value'],
          ['Currency', 'cad', 'Legacy display value']
        ]
      })
    );

    expect(config).toEqual({
      accountName: 'Trading',
      accountEquity: 20_000,
      defaultRiskPercent: 0.005,
      maxPositionPercent: 0.1,
      currency: 'CAD'
    });
  });

  it('maps Trading Accounts and rejects duplicate account IDs through domain validation', async () => {
    const headers = SHEET_DEFINITIONS.accounts.requiredHeaders;
    const loaded = sheets({
      [SHEET_DEFINITIONS.accounts.range]: [
        [...headers],
        rowFor(headers, {
          'Account ID': 'a1',
          Name: 'Account 1',
          'Base Currency': 'cad',
          'Risk % Per Trade': 0.005
        })
      ]
    });

    await expect(readTradingAccounts(loaded)).resolves.toEqual([
      { id: 'A1', name: 'Account 1', baseCurrency: 'CAD' }
    ]);

    await expect(
      readTradingAccounts(
        sheets({
          [SHEET_DEFINITIONS.accounts.range]: [
            [...headers],
            rowFor(headers, { 'Account ID': 'A1', Name: 'One', 'Base Currency': 'CAD' }),
            rowFor(headers, { 'Account ID': 'a1', Name: 'Duplicate', 'Base Currency': 'CAD' })
          ]
        })
      )
    ).rejects.toThrow('Trading Account ID dupliqué');
  });

  it('maps Momentum Ranking rows and filters incomplete identities', async () => {
    const headers = SHEET_DEFINITIONS.momentumRanking.requiredHeaders;
    const records = await readMomentumRankingRecords(
      sheets({
        [SHEET_DEFINITIONS.momentumRanking.range]: [
          [...headers],
          rowFor(headers, {
            Rank: 1,
            'Strategy ID': 'MOMENTUM_BREAKOUT',
            Strategy: 'Momentum Breakout',
            'Strategy Version': 'V1',
            'Signal Date': sheetsSerialDate('2026-08-27T00:00:00.000Z'),
            Ticker: 'BOX',
            Company: 'Box Inc',
            Price: 34.82,
            'Momentum Score': 87,
            'Review Status': 'REVIEW'
          }),
          rowFor(headers, { Rank: 2, Ticker: '' })
        ]
      })
    );

    expect(records).toEqual([
      expect.objectContaining({
        strategyId: 'MOMENTUM_BREAKOUT',
        signalDate: '2026-08-27',
        ticker: 'BOX',
        total: 87,
        reviewStatus: 'REVIEW'
      })
    ]);
  });
});
