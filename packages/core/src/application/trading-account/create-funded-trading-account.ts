import { createCapitalTransaction } from '../../domain/capital-transaction';
import {
  normalizeTradingAccountRecord,
  type TradingAccountRecord
} from '../../domain/trading-account';
import type { RuntimePort } from '../../ports/outbound/runtime-port';
import type { TradingAccountManagementRepository } from '../../ports/outbound/trading-account-management-repository';

export interface CreateFundedTradingAccountCommand {
  accountId: string;
  name: string;
  baseCurrency: string;
  riskPercentPerTrade: number;
  initialAmount: number;
}

export function createCreateFundedTradingAccount({
  repository,
  runtime
}: {
  repository: TradingAccountManagementRepository;
  runtime: RuntimePort;
}) {
  return (command: CreateFundedTradingAccountCommand): TradingAccountRecord => {
    const account = normalizeTradingAccountRecord({
      id: command.accountId,
      name: command.name,
      baseCurrency: command.baseCurrency,
      riskPercentPerTrade: command.riskPercentPerTrade
    });

    if (!Number.isFinite(command.initialAmount) || command.initialAmount <= 0) {
      throw new Error('Initial Amount doit être supérieur à 0.');
    }

    if (repository.findById(account.id)) {
      throw new Error(`Trading Account existe déjà : ${account.id}`);
    }

    const initialFunding = createCapitalTransaction({
      id: runtime.newId(),
      accountId: account.id,
      type: 'INITIAL_FUNDING',
      amount: command.initialAmount,
      occurredAt: runtime.now(),
      note: 'Initial funding'
    });

    repository.createFunded(account, initialFunding);
    return account;
  };
}
