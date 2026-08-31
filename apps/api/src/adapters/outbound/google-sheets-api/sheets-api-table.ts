import { elapsedMs, nowMs } from '../../../timing';
import type { SheetsValuesClient, SheetsValuesResponse } from './google-sheets-api-client';

export interface SheetTable {
  headers: string[];
  rows: unknown[][];
}

export interface LoadedSheetTable {
  table: SheetTable;
  sheetsMs: number;
  mappingMs: number;
}

export interface RequestScopedSheets {
  getTable(definition: SheetTableDefinition): Promise<LoadedSheetTable>;
  batchLoad(definitions: readonly SheetTableDefinition[]): Promise<void>;
  timings(): {
    sheetsMs: number;
    mappingMs: number;
  };
}

export interface SheetTableDefinition {
  key: string;
  sheetName: string;
  range: string;
  requiredHeaders?: readonly string[];
  required?: boolean;
  dateHeaders?: readonly string[];
}

const SHEETS_SERIAL_EPOCH_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;

export function createRequestScopedSheets(dependencies: {
  sheetsClient: SheetsValuesClient;
  spreadsheetId: string;
}): RequestScopedSheets {
  const loaded = new Map<string, LoadedSheetTable>();
  let totalSheetsMs = 0;
  let totalMappingMs = 0;

  async function getTable(definition: SheetTableDefinition): Promise<LoadedSheetTable> {
    const existing = loaded.get(definition.key);
    if (existing) return existing;

    const sheetsStart = nowMs();
    const response = await dependencies.sheetsClient.getValues({
      spreadsheetId: dependencies.spreadsheetId,
      range: definition.range,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER'
    });
    const sheetsMs = elapsedMs(sheetsStart);
    totalSheetsMs += sheetsMs;
    return loadResponse(definition, response, sheetsMs);
  }

  async function batchLoad(definitions: readonly SheetTableDefinition[]): Promise<void> {
    const missing = definitions.filter((definition) => !loaded.has(definition.key));
    if (missing.length === 0) return;

    if (!dependencies.sheetsClient.batchGetValues) {
      await Promise.all(missing.map((definition) => getTable(definition)));
      return;
    }

    const sheetsStart = nowMs();
    const responses = await dependencies.sheetsClient.batchGetValues({
      spreadsheetId: dependencies.spreadsheetId,
      ranges: missing.map((definition) => definition.range),
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER'
    });
    const sheetsMs = elapsedMs(sheetsStart);
    totalSheetsMs += sheetsMs;

    for (const definition of missing) {
      const response = responseForRange(responses, definition.range);
      loadResponse(definition, response, 0);
    }
  }

  function loadResponse(
    definition: SheetTableDefinition,
    response: SheetsValuesResponse,
    sheetsMs: number
  ): LoadedSheetTable {
    const mappingStart = nowMs();
    const values = response.values ?? [];
    if (values.length === 0 && definition.required) {
      throw new Error(`${definition.sheetName} est absent ou vide.`);
    }
    const headers = normalizeHeaders(values[0] ?? []);
    if (definition.requiredHeaders) {
      requireSheetHeaders(headers, definition.requiredHeaders, definition.sheetName);
    }
    const rows = values
      .slice(1)
      .map((row) => normalizeRow(headers, row, new Set(definition.dateHeaders ?? [])));
    const mappingMs = elapsedMs(mappingStart);
    totalMappingMs += mappingMs;
    const loadedTable = {
      table: { headers, rows },
      sheetsMs,
      mappingMs
    };
    loaded.set(definition.key, loadedTable);
    return loadedTable;
  }

  return {
    getTable,
    batchLoad,
    timings: () => ({ sheetsMs: totalSheetsMs, mappingMs: totalMappingMs })
  };
}

export function requireColumn(headers: readonly unknown[], name: string): number {
  const index = headers.findIndex((header) => String(header).trim() === name);
  if (index < 0) throw new Error(`Colonne obligatoire absente : ${name}`);
  return index;
}

export function requireSheetHeaders(
  headers: readonly unknown[],
  requiredHeaders: readonly string[],
  sheetName: string
): void {
  for (const header of requiredHeaders) {
    if (!headers.some((candidate) => String(candidate).trim() === header)) {
      throw new Error(`${sheetName} est incomplet : colonne ${header} absente.`);
    }
  }
}

export function textValue(value: unknown): string {
  return String(value || '').trim();
}

export function nullableText(value: unknown): string | null {
  const text = textValue(value);
  return text || null;
}

export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function snapshotValue<T = string | number | boolean | Date | null>(value: unknown): T | '' {
  if (value === null) return null as T;
  if (value instanceof Date) return value as T;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value as T;
  }
  return value === undefined ? '' : (String(value) as T);
}

export function valueByHeader(
  headers: readonly string[],
  row: readonly unknown[],
  name: string
): unknown {
  return row[requireColumn(headers, name)];
}

function normalizeHeaders(row: readonly unknown[]): string[] {
  return row.map((value) => String(value ?? '').trim());
}

function normalizeRow(
  headers: readonly string[],
  row: readonly unknown[],
  dateHeaders: ReadonlySet<string>
): unknown[] {
  return headers.map((header, index) => {
    const value = row[index] ?? '';
    if (!dateHeaders.has(header)) return value;
    return normalizeSheetsApiDateValue(value);
  });
}

function normalizeSheetsApiDateValue(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  return new Date(Math.round((value - SHEETS_SERIAL_EPOCH_OFFSET) * MS_PER_DAY));
}

function responseForRange(
  responses: Record<string, SheetsValuesResponse>,
  requestedRange: string
): SheetsValuesResponse {
  const exact = responses[requestedRange];
  if (hasValues(exact)) return exact;

  const canonicalMatch = Object.entries(responses).find(
    ([actualRange, response]) =>
      hasValues(response) && areEquivalentTableRanges(actualRange, requestedRange)
  )?.[1];
  if (canonicalMatch) return canonicalMatch;

  return exact ?? {};
}

function hasValues(response: SheetsValuesResponse | undefined): response is SheetsValuesResponse {
  return Boolean(response?.values?.length);
}

function areEquivalentTableRanges(actualRange: string, requestedRange: string): boolean {
  const actual = parseTableRange(actualRange);
  const requested = parseTableRange(requestedRange);
  if (!actual || !requested) return false;
  return (
    actual.sheetName === requested.sheetName &&
    actual.startColumn === requested.startColumn &&
    actual.endColumn === requested.endColumn
  );
}

function parseTableRange(range: string): {
  sheetName: string;
  startColumn: string;
  endColumn: string;
} | null {
  const separatorIndex = range.lastIndexOf('!');
  if (separatorIndex < 0) return null;
  const sheetName = range
    .slice(0, separatorIndex)
    .replace(/^'/, '')
    .replace(/'$/, '')
    .toLowerCase();
  const [start = '', end = start] = range.slice(separatorIndex + 1).split(':');
  const startColumn = columnName(start);
  const endColumn = columnName(end);
  if (!sheetName || !startColumn || !endColumn) return null;
  return { sheetName, startColumn, endColumn };
}

function columnName(a1Part: string): string {
  return (a1Part.match(/^[A-Za-z]+/)?.[0] ?? '').toUpperCase();
}
