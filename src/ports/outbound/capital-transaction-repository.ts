import type { CapitalTransaction } from '../../core/domain/capital-transaction';

export interface CapitalTransactionRepository {
  save(transaction: CapitalTransaction): void;
  findByAccountId(accountId: string): CapitalTransaction[];
}
