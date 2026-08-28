import type { TradePlan } from '../../../../core/domain/trade-plan';
import type { TradePlanReader } from '../../../../ports/outbound/trade-plan-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetHeaders } from '../sheet-headers';
import { tradePlanFromRow } from './trade-plan-mapper';
import { validateTradePlansSchema } from './trade-plan-sheet';

const TRADE_PLANS_SHEET_NAME = 'Trade Plans';

export class GoogleSheetsTradePlanReader implements TradePlanReader {
  findAll(): TradePlan[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(TRADE_PLANS_SHEET_NAME);
    if (!sheet) throw new Error(`${TRADE_PLANS_SHEET_NAME} est absente.`);

    validateTradePlansSchema(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const headers = readSheetHeaders(sheet);
    return sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues()
      .map((row) => tradePlanFromRow(headers, row))
      .filter((plan) => Boolean(plan.id));
  }
}
