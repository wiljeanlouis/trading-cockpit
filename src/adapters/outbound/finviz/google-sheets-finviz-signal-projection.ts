import type { MarketSignalBatch } from '../../../core/domain/market-signal';
import type { MarketSignalProjection } from '../../../ports/outbound/market-signal-projection';

declare function themeSimpleSheet(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string
): void;

export class GoogleSheetsFinvizSignalProjection implements MarketSignalProjection {
  constructor(private readonly sheetNamesByFeedId: Record<string, string>) {}

  replace(batch: MarketSignalBatch, refreshedAt: Date): void {
    const sheetName = this.sheetNamesByFeedId[batch.feed.id];
    if (!sheetName) throw new Error(`Projection Finviz absente pour ${batch.feed.id}.`);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    sheet.clearContents();
    const rows: unknown[][] = [
      ['Strategy ID', 'Strategy', 'Strategy Version', 'Refreshed At', ...batch.attributeNames],
      ...batch.signals.map((signal) => [
        batch.feed.strategyId,
        batch.feed.strategyName,
        batch.feed.strategyVersion,
        refreshedAt,
        ...batch.attributeNames.map((name) => signal.attributes[name])
      ])
    ];
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    if (rows.length > 1) {
      sheet.getRange(2, 4, rows.length - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
    themeSimpleSheet(spreadsheet, sheetName);
  }
}
