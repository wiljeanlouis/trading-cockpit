import type { RuntimePort } from '../../../ports/outbound/runtime-port';

export class AppsScriptRuntime implements RuntimePort {
  now(): Date {
    return new Date();
  }

  newId(): string {
    return Utilities.getUuid();
  }
}
