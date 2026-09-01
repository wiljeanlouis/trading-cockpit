import {
  normalizeTradingAccountRecord,
  type TradingAccountRecord
} from '../../domain/trading-account';
import type { TradingAccountManagementRepository } from '../../ports/outbound/trading-account-management-repository';

export interface CreateTradingAccountCommand {
  accountId: string;
  name: string;
  baseCurrency: string;
  riskPercentPerTrade: number;
}

export function createCreateTradingAccount(repository: TradingAccountManagementRepository) {
  return (command: CreateTradingAccountCommand): TradingAccountRecord => {
    const account = normalizeTradingAccountRecord({
      id: command.accountId,
      name: command.name,
      baseCurrency: command.baseCurrency,
      riskPercentPerTrade: command.riskPercentPerTrade
    });
    if (repository.findById(account.id)) {
      throw new Error(`Trading Account existe déjà : ${account.id}`);
    }
    repository.create(account);
    return account;
  };
}
