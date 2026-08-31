import type { RecordCapitalTransactionCommand } from '@trading-cockpit/backend-core/application/trading-account/record-capital-transaction';
import type { CapitalTransaction } from '@trading-cockpit/backend-core/domain/capital-transaction';

type Recorder = (command: RecordCapitalTransactionCommand) => CapitalTransaction;

function promptRequired(
  ui: GoogleAppsScript.Base.Ui,
  title: string,
  prompt: string
): string | null {
  const response = ui.prompt(title, prompt, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  return response.getResponseText().trim();
}

function recordCapitalTransaction(label: string, recorder: Recorder): void {
  const ui = SpreadsheetApp.getUi();
  const accountId = promptRequired(ui, label, 'Account ID :');
  if (accountId === null) return;
  const amountText = promptRequired(ui, label, 'Montant positif :');
  if (amountText === null) return;
  const note = promptRequired(ui, label, 'Note optionnelle :');
  if (note === null) return;

  const transaction = recorder({
    accountId,
    amount: Number(amountText.replace(',', '.')),
    note
  });
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `${transaction.type} ${transaction.amount.toFixed(2)} — ${transaction.accountId}`,
    'Trading Cockpit',
    7
  );
}

export const recordInitialFundingFromSheets = (recorder: Recorder): void =>
  recordCapitalTransaction('Record Initial Funding', recorder);
export const recordDepositFromSheets = (recorder: Recorder): void =>
  recordCapitalTransaction('Record Deposit', recorder);
export const recordWithdrawalFromSheets = (recorder: Recorder): void =>
  recordCapitalTransaction('Record Withdrawal', recorder);
