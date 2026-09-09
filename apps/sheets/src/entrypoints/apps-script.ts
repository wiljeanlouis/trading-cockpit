import { installCockpitMenu } from '../adapters/inbound/google-sheets/ui/install-cockpit-menu';
import { rememberActiveTradingCockpitSpreadsheet } from '../adapters/outbound/google-sheets/trading-cockpit-spreadsheet';
import { runInitializeTradingCockpit, runValidateTradingCockpit } from '../composition/workbook';
import type { WorkbookSetupReport } from '../adapters/inbound/google-sheets/ui/trading-cockpit-workbook';

/**
 * Minimal Apps Script global surface for workbook setup/validation.
 *
 * React/Cloud Run is the only supported operational Trading Cockpit UI; Apps Script remains only
 * for technical workbook lifecycle tooling attached to the Google Sheet datastore.
 */
export function onOpen(): void {
  installCockpitMenu();
  rememberActiveTradingCockpitSpreadsheet();
}

export function initializeTradingCockpit(): WorkbookSetupReport {
  return runInitializeTradingCockpit();
}

export function validateTradingCockpit(): WorkbookSetupReport {
  return runValidateTradingCockpit();
}
