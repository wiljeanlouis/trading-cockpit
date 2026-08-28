export const CAPITAL_TRANSACTION_TYPES = ['INITIAL_FUNDING', 'DEPOSIT', 'WITHDRAWAL'] as const;
export type CapitalTransactionType = (typeof CAPITAL_TRANSACTION_TYPES)[number];

export interface CapitalTransaction {
  id: string;
  accountId: string;
  type: CapitalTransactionType;
  amount: number;
  occurredAt: Date;
  note: string;
}

export interface AccountCapitalSummary {
  accountId: string;
  baseCurrency: string;
  initialFunding: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netExternalCapital: number;
}

export function createCapitalTransaction(input: CapitalTransaction): CapitalTransaction {
  const id = String(input.id || '').trim();
  const accountId = String(input.accountId || '')
    .trim()
    .toUpperCase();
  const type = String(input.type || '')
    .trim()
    .toUpperCase() as CapitalTransactionType;

  if (!id) throw new Error('Transaction ID absent.');
  if (!accountId) throw new Error('Account ID absent.');
  if (!CAPITAL_TRANSACTION_TYPES.includes(type))
    throw new Error(`Type de transaction invalide : ${type}`);
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Le montant doit être supérieur à 0.');
  }
  if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) {
    throw new Error('Occurred At absent ou invalide.');
  }

  return {
    id,
    accountId,
    type,
    amount: input.amount,
    occurredAt: input.occurredAt,
    note: String(input.note || '').trim()
  };
}

export function summarizeExternalCapital(
  accountId: string,
  baseCurrency: string,
  transactions: CapitalTransaction[]
): AccountCapitalSummary {
  let initialFunding = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'INITIAL_FUNDING') initialFunding += transaction.amount;
    if (transaction.type === 'DEPOSIT') totalDeposits += transaction.amount;
    if (transaction.type === 'WITHDRAWAL') totalWithdrawals += transaction.amount;
  }
  return {
    accountId,
    baseCurrency,
    initialFunding,
    totalDeposits,
    totalWithdrawals,
    netExternalCapital: initialFunding + totalDeposits - totalWithdrawals
  };
}
