import type { CockpitGateway } from '../infrastructure/cockpit-gateway';
import { MockCockpitGateway } from '../infrastructure/mock-cockpit-gateway';

export function createCockpitGateway(): CockpitGateway {
  return new MockCockpitGateway();
}
