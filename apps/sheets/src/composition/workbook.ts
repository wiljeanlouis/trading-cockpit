import {
  initializeTradingCockpitWorkbook,
  validateTradingCockpitWorkbook,
  type WorkbookSetupReport
} from '../adapters/inbound/google-sheets/ui/trading-cockpit-workbook';

export function runInitializeTradingCockpit(): WorkbookSetupReport {
  return initializeTradingCockpitWorkbook();
}

export function runValidateTradingCockpit(): WorkbookSetupReport {
  return validateTradingCockpitWorkbook();
}
