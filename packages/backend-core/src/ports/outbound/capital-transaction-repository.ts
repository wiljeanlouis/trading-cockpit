import type { CapitalTransaction } from '../../domain/capital-transaction';

export interface CapitalTransactionRepository {
  save(transaction: CapitalTransaction): void;
  findByAccountId(accountId: string): CapitalTransaction[];
}
