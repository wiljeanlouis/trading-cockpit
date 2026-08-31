import type { Position } from '@trading-cockpit/core/domain/position';
import type { PositionReader } from '@trading-cockpit/core/ports/outbound/position-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetTable } from '../sheet-headers';
import { positionFromRow } from './position-mapper';
import { validatePositionsHeaders } from './position-sheet';

const POSITIONS_SHEET_NAME = 'Positions';

export class GoogleSheetsPositionReader implements PositionReader {
  findAll(): Position[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(POSITIONS_SHEET_NAME);
    if (!sheet) throw new Error(`${POSITIONS_SHEET_NAME} est absente.`);

    const { headers, rows } = readSheetTable(sheet);
    validatePositionsHeaders(headers);
    const hasAccountId = headers.includes('Account ID');
    const mapperHeaders = hasAccountId ? headers : [...headers, 'Account ID'];

    return rows
      .map((row) => positionFromRow(mapperHeaders, hasAccountId ? row : [...row, '']))
      .filter((position) => Boolean(position.id));
  }
}
