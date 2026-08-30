import type { TradePlan } from '../../../../core/domain/trade-plan';
import type { TradePlanReader } from '../../../../ports/outbound/trade-plan-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetTable } from '../sheet-headers';
import { tradePlanFromRow } from './trade-plan-mapper';
import { validateTradePlansHeaders } from './trade-plan-sheet';

const TRADE_PLANS_SHEET_NAME = 'Trade Plans';

export class GoogleSheetsTradePlanReader implements TradePlanReader {
  findAll(): TradePlan[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(TRADE_PLANS_SHEET_NAME);
    if (!sheet) throw new Error(`${TRADE_PLANS_SHEET_NAME} est absente.`);

    const { headers, rows } = readSheetTable(sheet);
    validateTradePlansHeaders(headers);
    return rows.map((row) => tradePlanFromRow(headers, row)).filter((plan) => Boolean(plan.id));
  }
}
