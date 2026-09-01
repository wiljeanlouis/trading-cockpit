import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Admin } from '../../src/features/admin/Admin';
import { createGatewayStub } from '../support/cockpit-gateway';

describe('Admin', () => {
  it('does not expose obsolete Cockpit Config account finance fields', async () => {
    render(
      <Admin
        gateway={createGatewayStub({
          getTradingAccounts: vi.fn(async () => ({
            accounts: [{ id: 'A1', name: 'Main Account', baseCurrency: 'CAD' }]
          })),
          getTradingConfig: vi.fn(async () => ({ settings: [] })),
          checkFinvizAuth: vi.fn(async () => true)
        })}
      />
    );

    expect(await screen.findByText('No global Cockpit settings')).toBeInTheDocument();
    expect(screen.queryByText('Account equity')).not.toBeInTheDocument();
    expect(screen.queryByText('Default risk %')).not.toBeInTheDocument();
    expect(screen.queryByText('Max position %')).not.toBeInTheDocument();
    expect(screen.getByText('Capital ledger entry')).toBeInTheDocument();
  });
});
