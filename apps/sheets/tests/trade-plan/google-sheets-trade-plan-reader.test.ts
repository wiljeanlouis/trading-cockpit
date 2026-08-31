/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsTradePlanReader } from '../../src/adapters/outbound/google-sheets/trade-plan/google-sheets-trade-plan-reader';
import {
  TRADE_PLAN_HEADERS,
  tradePlanToRow
} from '../../src/adapters/outbound/google-sheets/trade-plan/trade-plan-mapper';
import type { TradePlan } from '@trading-cockpit/core/domain/trade-plan';

afterEach(() => vi.unstubAllGlobals());

const plan = {
  id: 'TP-1',
  accountId: 'A1',
  watchlistId: 'WL-1',
  strategyId: 'BREAKOUT',
  strategyName: 'Breakout',
  strategyVersion: 'V1',
  signalDate: '2026-08-27',
  signalPrice: 33,
  ticker: 'BOX',
  referencePrice: 34,
  momentumScore: 87,
  setupStatus: 'CONFIRMED',
  breakoutLevel: 34.5,
  invalidationLevel: 32.8,
  eventRisk: 'CLEAR',
  createdAt: new Date('2026-08-28T14:00:00.000Z'),
  entryType: 'BREAKOUT',
  entryPrice: 35,
  stopPrice: 32.8,
  targetPrice: 40,
  riskPerShare: 2.2,
  rewardPerShare: 5,
  riskReward: 2.27,
  accountEquity: 10_000,
  riskPercent: 0.01,
  maxRisk: 100,
  positionSize: 45,
  positionValue: 1575,
  status: 'READY',
  notes: ''
} satisfies TradePlan;

function sheetWith(rows: unknown[][]) {
  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => TRADE_PLAN_HEADERS.length,
    getRange: vi.fn((row: number, _column: number, numberOfRows: number) => ({
      getValues: () =>
        row === 1 && numberOfRows > 1
          ? [[...TRADE_PLAN_HEADERS], ...rows]
          : [[...TRADE_PLAN_HEADERS]]
    }))
  };
}

describe('Google Sheets Trade Plan reader', () => {
  it('reads existing rows through the authoritative mapper without writing', () => {
    const sheet = sheetWith([tradePlanToRow(plan)]);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });

    expect(new GoogleSheetsTradePlanReader().findAll()[0]).toMatchObject({
      id: 'TP-1',
      accountId: 'A1',
      ticker: 'BOX',
      status: 'READY'
    });
    expect(sheet.getRange).toHaveBeenCalledTimes(1);
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 2, TRADE_PLAN_HEADERS.length);
  });

  it('returns an empty list for a header-only sheet', () => {
    const sheet = sheetWith([]);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });
    expect(new GoogleSheetsTradePlanReader().findAll()).toEqual([]);
  });

  it('reports a missing Trade Plans sheet without creating it', () => {
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => null })
    });
    expect(() => new GoogleSheetsTradePlanReader().findAll()).toThrow('Trade Plans est absente.');
  });
});
