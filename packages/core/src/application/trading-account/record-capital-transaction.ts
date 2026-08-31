import {
  createCapitalTransaction,
  type CapitalTransaction,
  type CapitalTransactionType
} from '../../domain/capital-transaction';
import type { CapitalTransactionRepository } from '../../ports/outbound/capital-transaction-repository';
import type { RuntimePort } from '../../ports/outbound/runtime-port';
import type { TradingAccountRepository } from '../../ports/outbound/trading-account-repository';

export interface RecordCapitalTransactionCommand {
  accountId: string;
  amount: number;
  occurredAt?: Date;
  note?: string;
}

export interface RecordCapitalTransactionDependencies {
  tradingAccountRepository: TradingAccountRepository;
  capitalTransactionRepository: CapitalTransactionRepository;
  runtime: RuntimePort;
}

function createRecorder(
  type: CapitalTransactionType,
  dependencies: RecordCapitalTransactionDependencies
): (command: RecordCapitalTransactionCommand) => CapitalTransaction {
  return (command) => {
    const accountId = String(command.accountId || '')
      .trim()
      .toUpperCase();
    if (!accountId) throw new Error('Account ID absent.');
    if (!dependencies.tradingAccountRepository.findById(accountId)) {
      throw new Error(`Trading Account introuvable : ${accountId}`);
    }
    if (!Number.isFinite(command.amount) || command.amount <= 0) {
      throw new Error('Le montant doit être supérieur à 0.');
    }
    if (
      type === 'INITIAL_FUNDING' &&
      dependencies.capitalTransactionRepository
        .findByAccountId(accountId)
        .some((transaction) => transaction.type === 'INITIAL_FUNDING')
    ) {
      throw new Error(`INITIAL_FUNDING existe déjà pour ${accountId}.`);
    }

    const transaction = createCapitalTransaction({
      id: dependencies.runtime.newId(),
      accountId,
      type,
      amount: command.amount,
      occurredAt: command.occurredAt ?? dependencies.runtime.now(),
      note: command.note ?? ''
    });
    dependencies.capitalTransactionRepository.save(transaction);
    return transaction;
  };
}

export const createRecordInitialFunding = (dependencies: RecordCapitalTransactionDependencies) =>
  createRecorder('INITIAL_FUNDING', dependencies);
export const createRecordDeposit = (dependencies: RecordCapitalTransactionDependencies) =>
  createRecorder('DEPOSIT', dependencies);
export const createRecordWithdrawal = (dependencies: RecordCapitalTransactionDependencies) =>
  createRecorder('WITHDRAWAL', dependencies);
