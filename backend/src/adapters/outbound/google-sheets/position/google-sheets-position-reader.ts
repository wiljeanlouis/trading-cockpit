import type { Position } from '../../../../core/domain/position';
import type { PositionReader } from '../../../../ports/outbound/position-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetHeaders } from '../sheet-headers';
import { positionFromRow } from './position-mapper';
import { validatePositionsSchema } from './position-sheet';

const POSITIONS_SHEET_NAME = 'Positions';

export class GoogleSheetsPositionReader implements PositionReader {
  findAll(): Position[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(POSITIONS_SHEET_NAME);
    if (!sheet) throw new Error(`${POSITIONS_SHEET_NAME} est absente.`);

    validatePositionsSchema(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const headers = readSheetHeaders(sheet);
    const hasAccountId = headers.includes('Account ID');
    const mapperHeaders = hasAccountId ? headers : [...headers, 'Account ID'];

    return sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues()
      .map((row) => positionFromRow(mapperHeaders, hasAccountId ? row : [...row, '']))
      .filter((position) => Boolean(position.id));
  }
}
