import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Admin } from '../../src/features/admin/Admin';
import { createGatewayStub } from '../support/cockpit-gateway';
import type { AdminOverviewDto } from '@trading-cockpit/contracts';

const overview: AdminOverviewDto = {
  finviz: { configured: true },
  accounts: [
    {
      id: 'A1',
      name: 'Main Account',
      baseCurrency: 'CAD',
      riskPercentPerTrade: 0.005,
      financialSummary: {
        initialFunding: 10_000,
        deposits: 500,
        withdrawals: 100,
        netExternalCapital: 10_400,
        realizedPnl: 250,
        realizedEquity: 10_650
      },
      capitalTransactions: [
        {
          transactionId: 'CT-2',
          accountId: 'A1',
          type: 'DEPOSIT',
          amount: 500,
          occurredAt: '2026-09-01T12:00:00.000Z',
          note: 'Top up'
        },
        {
          transactionId: 'CT-1',
          accountId: 'A1',
          type: 'INITIAL_FUNDING',
          amount: 10_000,
          occurredAt: '2026-08-01T12:00:00.000Z',
          note: 'Initial funding'
        }
      ]
    }
  ]
};

describe('Admin', () => {
  it('loads one compact Admin overview and removes legacy standalone controls', async () => {
    render(
      <Admin gateway={createGatewayStub({ getAdminOverview: vi.fn(async () => overview) })} />
    );

    expect(await screen.findByText('Finviz')).toBeInTheDocument();
    expect(screen.getByText('Market data provider and authentication.')).toBeInTheDocument();
    expect(screen.queryByText(/Refresh Finviz archives/)).not.toBeInTheDocument();
    expect(screen.queryByText('Capital Ledger')).not.toBeInTheDocument();
    expect(screen.queryByText('Setup Trading Accounts')).not.toBeInTheDocument();
    expect(screen.queryByText('No global Cockpit settings')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete token' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Account' })).not.toBeInTheDocument();
  });

  it('creates a funded account through one gateway operation', async () => {
    const createFundedTradingAccount = vi.fn(async () => ({
      id: 'A2',
      name: 'Second Account',
      baseCurrency: 'USD',
      riskPercentPerTrade: 0.01
    }));
    render(
      <Admin
        gateway={createGatewayStub({
          getAdminOverview: vi.fn(async () => overview),
          createFundedTradingAccount
        })}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: '+ Add account' }));
    fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: 'a2' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Second Account' } });
    fireEvent.change(screen.getByLabelText('Base Currency'), { target: { value: 'usd' } });
    fireEvent.change(screen.getByLabelText('Risk / Trade (%)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Initial Amount'), { target: { value: '25000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create funded account' }));

    await waitFor(() =>
      expect(createFundedTradingAccount).toHaveBeenCalledWith({
        accountId: 'a2',
        name: 'Second Account',
        baseCurrency: 'usd',
        riskPercentPerTrade: 0.01,
        initialAmount: 25_000
      })
    );
  });

  it('manages account settings and capital activity from the Manage dialog', async () => {
    const updateTradingAccount = vi.fn(async () => ({
      id: 'A1',
      name: 'Updated Account',
      baseCurrency: 'CAD',
      riskPercentPerTrade: 0.0075
    }));
    const recordCapitalTransaction = vi.fn(async () => ({
      transactionId: 'CT-3',
      accountId: 'A1',
      type: 'WITHDRAWAL' as const,
      amount: 200,
      occurredAt: '2026-09-02T12:00:00.000Z',
      note: 'Transfer'
    }));
    render(
      <Admin
        gateway={createGatewayStub({
          getAdminOverview: vi.fn(async () => overview),
          updateTradingAccount,
          recordCapitalTransaction
        })}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Manage' }));
    const dialog = screen.getByRole('dialog', { name: 'A1' });
    expect(within(dialog).getByText('Financial summary')).toBeInTheDocument();
    expect(within(dialog).getByText('Capital activity')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('option', { name: 'Initial Funding' })
    ).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Updated Account' }
    });
    fireEvent.change(within(dialog).getByLabelText('Risk / Trade (%)'), {
      target: { value: '0.75' }
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(updateTradingAccount).toHaveBeenCalledWith({
        accountId: 'A1',
        name: 'Updated Account',
        baseCurrency: 'CAD',
        riskPercentPerTrade: 0.0075
      })
    );

    fireEvent.change(within(dialog).getByLabelText('Transaction Type'), {
      target: { value: 'WITHDRAWAL' }
    });
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '200' } });
    fireEvent.change(within(dialog).getByLabelText('Note'), { target: { value: 'Transfer' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record withdrawal' }));

    await waitFor(() =>
      expect(recordCapitalTransaction).toHaveBeenCalledWith({
        type: 'WITHDRAWAL',
        accountId: 'A1',
        amount: 200,
        note: 'Transfer'
      })
    );
  });
});
