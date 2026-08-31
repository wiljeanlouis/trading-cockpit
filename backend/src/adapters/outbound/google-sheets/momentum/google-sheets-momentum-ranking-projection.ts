import type { RankedMomentumCandidate } from '@trading-cockpit/backend-core/domain/momentum';
import type { MomentumRankingProjection } from '@trading-cockpit/backend-core/ports/outbound/momentum-ranking-projection';
import type { MomentumStrategySnapshot } from '@trading-cockpit/backend-core/ports/outbound/momentum-signal-repository';
import { themeRanking } from '../../../inbound/google-sheets/theme/theme';

const MOMENTUM_RANKING_SHEET_NAME = 'Momentum Ranking';
export const MOMENTUM_RANKING_HEADERS = [
  'Rank',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Signal Date',
  'Ticker',
  'Company',
  'Sector',
  'Price',
  '52W High',
  '52W Score',
  'Relative Volume',
  'RelVol Score',
  'Performance Month',
  'Performance Score',
  'RSI',
  'RSI Score',
  'SMA20',
  'SMA20 Score',
  'Momentum Score',
  'Review Status'
];

export class GoogleSheetsMomentumRankingProjection implements MomentumRankingProjection {
  replace(
    ranked: RankedMomentumCandidate[],
    signalDate: string,
    strategy: MomentumStrategySnapshot
  ): void {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet =
      spreadsheet.getSheetByName(MOMENTUM_RANKING_SHEET_NAME) ??
      spreadsheet.insertSheet(MOMENTUM_RANKING_SHEET_NAME);
    sheet.clear();
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
    sheet
      .getRange('A1')
      .setValue(`${strategy.name.toUpperCase()} RANKING ${strategy.version}`)
      .setFontWeight('bold')
      .setFontSize(14);
    sheet.getRange('A2').setValue(`Signal Date: ${signalDate}`);
    sheet.getRange('A3').setValue('Score de priorisation seulement — pas un signal d’achat.');
    sheet
      .getRange(5, 1, 1, MOMENTUM_RANKING_HEADERS.length)
      .setValues([MOMENTUM_RANKING_HEADERS])
      .setFontWeight('bold');
    if (ranked.length === 0) return;

    const output = ranked.map((item, index) => [
      index + 1,
      item.strategyId,
      item.strategy || strategy.name,
      item.strategyVersion,
      item.signalDate,
      item.ticker,
      item.company,
      item.sector,
      item.price,
      item.high52,
      item.high52Score,
      item.relativeVolume,
      item.relativeVolumeScore,
      item.performanceMonth,
      item.performanceScore,
      item.rsi,
      item.rsiScore,
      item.sma20,
      item.sma20Score,
      item.total,
      'REVIEW'
    ]);
    sheet.getRange(6, 1, output.length, MOMENTUM_RANKING_HEADERS.length).setValues(output);
    sheet.getRange(6, 5, output.length, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(6, 9, output.length, 1).setNumberFormat('0.00');
    sheet.getRange(6, 10, output.length, 1).setNumberFormat('0.00%');
    sheet.getRange(6, 14, output.length, 1).setNumberFormat('0.00%');
    sheet.getRange(6, 18, output.length, 1).setNumberFormat('0.00%');
    sheet.getRange(6, 20, output.length, 1).setNumberFormat('0');
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['REVIEW', 'WATCH', 'READY', 'REJECT'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(6, 21, output.length, 1).setDataValidation(statusRule);
    sheet.setFrozenRows(5);
    sheet.autoResizeColumns(1, MOMENTUM_RANKING_HEADERS.length);
    themeRanking(spreadsheet);
  }
}
