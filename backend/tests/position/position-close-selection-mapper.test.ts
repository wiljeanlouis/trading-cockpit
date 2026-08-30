import { describe, expect, it } from 'vitest';
import {
  closePositionCommand,
  selectedPositionForClose,
  selectedPositionId
} from '../../src/adapters/inbound/google-sheets/ui/position-close-selection-mapper';

const headers = ['Position ID', 'Watchlist ID', 'Strategy ID', 'Ticker', 'Status'];

describe('Position close selection mapper', () => {
  it('extracts only the trimmed Position ID for reconciliation', () => {
    expect(selectedPositionId(headers, [' P-1 ', '', '', '', 'CLOSED'])).toBe('P-1');
  });
  it('preserves selection validation and normalizes OPEN only', () => {
    expect(selectedPositionForClose(headers, [' P-1 ', 'WL-1', 'S-1', 'urnb', ' open '])).toEqual({
      positionId: 'P-1',
      ticker: 'urnb'
    });
  });
  it.each([
    [['', 'WL-1', 'S-1', 'URNB', 'OPEN'], 'Position ID absent.'],
    [['P-1', '', 'S-1', 'URNB', 'OPEN'], 'Watchlist ID absent.'],
    [['P-1', 'WL-1', '', 'URNB', 'OPEN'], 'Strategy ID absent.'],
    [['P-1', 'WL-1', 'S-1', 'URNB', 'CLOSED'], "URNB n'est pas une position OPEN."]
  ])('rejects invalid selected row', (row, message) => {
    expect(() => selectedPositionForClose(headers, row)).toThrow(message as string);
  });
  it.each([
    ['95.25', 95.25],
    [' 95,25 ', 95.25]
  ])('parses legacy exit input %s', (text, expected) => {
    expect(closePositionCommand('P-1', text)).toEqual({ positionId: 'P-1', exitPrice: expected });
  });
  it.each(['', '0', '-1', 'text', 'Infinity'])('rejects legacy-invalid exit input %s', (text) => {
    expect(() => closePositionCommand('P-1', text)).toThrow(
      'Le prix de sortie doit être supérieur à 0.'
    );
  });
});
