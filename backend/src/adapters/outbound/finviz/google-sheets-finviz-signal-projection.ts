import type { MarketSignalBatch } from '@trading-cockpit/backend-core/domain/market-signal';
import type { MarketSignalProjection } from '@trading-cockpit/backend-core/ports/outbound/market-signal-projection';
import { themeSimpleSheet } from '../../inbound/google-sheets/theme/theme';

export class GoogleSheetsFinvizSignalProjection implements MarketSignalProjection {
  constructor(
    private readonly sheetNamesByFeedId: Record<string, string>,
    private readonly diagnostics?: {
      info(event: string, fields: Record<string, unknown>): void;
      error(stage: string, error: unknown): void;
    }
  ) {}

  replace(batch: MarketSignalBatch, refreshedAt: Date): void {
    const sheetName = this.sheetNamesByFeedId[batch.feed.id];
    if (!sheetName) throw new Error(`Projection Finviz absente pour ${batch.feed.id}.`);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
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
    this.diagnostics?.info('PROJECTION_PREPARED', {
      rows: Math.max(0, rows.length - 1),
      columns: rows[0].length
    });
    try {
      sheet.clearContents();
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      this.diagnostics?.info('SHEETS_WRITE', { rows: rows.length, columns: rows[0].length });
    } catch (error) {
      this.diagnostics?.error('PROJECTION_WRITE', error);
      throw error;
    }
    if (rows.length > 1) {
      sheet.getRange(2, 4, rows.length - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
    themeSimpleSheet(spreadsheet, sheetName);
  }
}
