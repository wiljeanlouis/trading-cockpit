export type RuntimeLogFields = Record<string, unknown>;

const SENSITIVE_FIELD = /(credential|secret|token|password|authenticatedurl|^auth$|^url$)/i;

function redactText(value: string): string {
  return value.replace(/([?&]auth=)[^&\s]+/gi, '$1[REDACTED]');
}

function safeValue(key: string, value: unknown): string {
  if (SENSITIVE_FIELD.test(key)) return '[REDACTED]';
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(redactText(value));
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(String(value));
}

function fieldsText(fields: RuntimeLogFields): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${safeValue(key, value)}`)
    .join(' ');
}

export function errorFields(error: unknown): RuntimeLogFields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(error.stack ? { errorStack: error.stack } : {})
    };
  }
  return { errorName: 'UnknownError', errorMessage: String(error) };
}

export class RuntimeLogger {
  readonly runId: string;
  private readonly startedAt: number;

  constructor(
    readonly workflow: string,
    options: { runId?: string; now?: () => number } = {}
  ) {
    this.runId = options.runId ?? Math.random().toString(16).slice(2, 8).padEnd(6, '0');
    this.now = options.now ?? Date.now;
    this.startedAt = this.now();
  }

  private readonly now: () => number;

  start(fields: RuntimeLogFields = {}): void {
    this.emit('info', 'START', fields);
  }

  info(event: string, fields: RuntimeLogFields = {}): void {
    this.emit('info', event, fields);
  }

  warn(event: string, fields: RuntimeLogFields = {}): void {
    this.emit('warn', event, fields);
  }

  blocked(error: unknown, fields: RuntimeLogFields = {}): void {
    this.emit('warn', 'BLOCKED', { ...errorFields(error), ...fields });
  }

  error(stage: string, error: unknown, fields: RuntimeLogFields = {}): void {
    this.emit('error', 'ERROR', { stage, ...errorFields(error), ...fields });
  }

  success(fields: RuntimeLogFields = {}): void {
    this.emit('info', 'SUCCESS', { ...fields, durationMs: this.now() - this.startedAt });
  }

  private emit(level: 'info' | 'warn' | 'error', event: string, fields: RuntimeLogFields): void {
    try {
      const details = fieldsText(fields);
      console[level](
        `[TradingCockpit][${this.workflow}][${this.runId}] ${event}${details ? ` ${details}` : ''}`
      );
    } catch {
      // Observability must never alter workflow behavior.
    }
  }
}
