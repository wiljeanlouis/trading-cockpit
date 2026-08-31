import type { RuntimePort } from '@trading-cockpit/backend-core/ports/outbound/runtime-port';

export class AppsScriptRuntime implements RuntimePort {
  now(): Date {
    return new Date();
  }

  newId(): string {
    return Utilities.getUuid();
  }
}
