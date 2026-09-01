import type { MutationContext } from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import { ValidationError } from '../http/errors';

export interface MutationDependencies {
  mutationContext: MutationContext;
  body: Record<string, unknown>;
  now: () => Date;
}

export function requiredText(value: unknown, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new ValidationError(`${field} is required.`);
  return text;
}

export function requiredNumber(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new ValidationError(`${field} must be a finite number.`);
  return number;
}

export function optionalNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  return requiredNumber(value, field);
}

export function serializedDate(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const text = String(value ?? '').trim();
  return text || null;
}

export function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
