import { requireColumn } from '../sheet-headers';

export interface SheetTradingStrategy {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
}

export function mapTradingStrategyRow(
  headers: readonly unknown[],
  row: readonly unknown[]
): SheetTradingStrategy {
  const idColumn = requireColumn(headers, 'Strategy ID');
  const nameColumn = requireColumn(headers, 'Name');
  const typeColumn = requireColumn(headers, 'Type');
  const enabledColumn = requireColumn(headers, 'Enabled');
  const descriptionColumn = requireColumn(headers, 'Description');
  return {
    id: String(row[idColumn] || '').trim(),
    name: String(row[nameColumn] || '').trim(),
    type: String(row[typeColumn] || '').trim(),
    enabled: requiredBoolean(row[enabledColumn], 'Enabled'),
    description: String(row[descriptionColumn] || '').trim()
  };
}

export function hasMeaningfulStrategyTableRow(row: readonly unknown[]): boolean {
  return row.some(
    (value) => value === true || (typeof value !== 'boolean' && String(value ?? '').trim() !== '')
  );
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (value === true || value === false) return value;
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  if (text === 'TRUE') return true;
  if (text === 'FALSE') return false;
  throw new Error(`${label} obligatoire.`);
}
