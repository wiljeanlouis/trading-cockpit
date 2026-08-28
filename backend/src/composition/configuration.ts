import {
  readLegacyCockpitConfiguration,
  setupLegacyCockpitConfiguration
} from '../adapters/outbound/google-sheets/cockpit-config/cockpit-configuration-sheet';

export function runSetupCockpitConfiguration(): void {
  setupLegacyCockpitConfiguration();
}

export function runGetLegacyTradingConfiguration() {
  return readLegacyCockpitConfiguration();
}
