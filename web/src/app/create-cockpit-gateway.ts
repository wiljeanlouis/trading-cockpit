import type { CockpitGateway } from '../infrastructure/cockpit-gateway';
import { AppsScriptCockpitGateway } from '../infrastructure/apps-script/apps-script-cockpit-gateway';
import { MockCockpitGateway } from '../infrastructure/mock-cockpit-gateway';

export function createCockpitGateway(): CockpitGateway {
  return import.meta.env.DEV ? new MockCockpitGateway() : new AppsScriptCockpitGateway();
}
