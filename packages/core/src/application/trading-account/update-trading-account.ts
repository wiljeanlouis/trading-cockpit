import {
  normalizeTradingAccountRecord,
  type TradingAccountRecord
} from '../../domain/trading-account';
import type {
  TradingAccountManagementRepository,
  TradingAccountReferenceSummary
} from '../../ports/outbound/trading-account-management-repository';

export interface UpdateTradingAccountCommand {
  accountId: string;
  name: string;
  baseCurrency: string;
  riskPercentPerTrade: number;
}

export function createUpdateTradingAccount(repository: TradingAccountManagementRepository) {
  return (command: UpdateTradingAccountCommand): TradingAccountRecord => {
    const accountId = String(command.accountId || '')
      .trim()
      .toUpperCase();
    if (!accountId) throw new Error('Account ID absent.');

    const existing = repository.findById(accountId);
    if (!existing) throw new Error(`Trading Account introuvable : ${accountId}`);

    const updated = normalizeTradingAccountRecord({
      id: accountId,
      name: command.name,
      baseCurrency: command.baseCurrency,
      riskPercentPerTrade: command.riskPercentPerTrade
    });

    if (updated.id !== existing.id) throw new Error('Account ID ne peut pas être modifié.');
    if (
      updated.baseCurrency !== existing.baseCurrency &&
      hasReferences(repository.countReferences(accountId))
    ) {
      throw new Error(
        `Base Currency ne peut pas être modifiée pour ${accountId} car le compte a déjà des données financières ou de trading.`
      );
    }

    repository.update(updated);
    return updated;
  };
}

function hasReferences(summary: TradingAccountReferenceSummary): boolean {
  return (
    summary.tradePlans > 0 ||
    summary.positions > 0 ||
    summary.journalEntries > 0 ||
    summary.capitalTransactions > 0
  );
}
