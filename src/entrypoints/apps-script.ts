import {
  runAddSelectedToWatchlist,
  runCreateTradePlanFromSelectedWatchlist,
  runCloseSelectedPosition,
  runReconcileSelectedPosition,
  runExecuteSelectedTradePlan,
  runSetupTradingAccounts,
  runRecordInitialFunding,
  runRecordDeposit,
  runRecordWithdrawal
} from '../composition/cockpit';
import { installCockpitMenu } from '../adapters/inbound/google-sheets/install-cockpit-menu';

export function onOpen(): void {
  installCockpitMenu();
}

export function addSelectedToWatchlist(): void {
  runAddSelectedToWatchlist();
}

export function createTradePlanFromSelectedWatchlist(): void {
  runCreateTradePlanFromSelectedWatchlist();
}

export function executeSelectedTradePlan(): void {
  runExecuteSelectedTradePlan();
}

export function closeSelectedPosition(): void {
  runCloseSelectedPosition();
}

export function reconcileSelectedPosition(): void {
  runReconcileSelectedPosition();
}

export function setupTradingAccounts(): void {
  runSetupTradingAccounts();
}

export function recordInitialFunding(): void {
  runRecordInitialFunding();
}

export function recordDeposit(): void {
  runRecordDeposit();
}

export function recordWithdrawal(): void {
  runRecordWithdrawal();
}
