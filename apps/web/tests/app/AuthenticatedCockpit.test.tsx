import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedCockpit } from '../../src/app/AuthenticatedCockpit';
import type { GoogleIdentityCredentialResponse } from '../../src/infrastructure/auth/google-identity';

let credentialCallback: ((response: GoogleIdentityCredentialResponse) => void) | null = null;

function installGoogleIdentityStub() {
  credentialCallback = null;
  window.google = {
    accounts: {
      id: {
        initialize: vi.fn((options) => {
          credentialCallback = options.callback;
        }),
        renderButton: vi.fn(),
        disableAutoSelect: vi.fn()
      }
    }
  };
}

function fetchJson(body: unknown, init: ResponseInit = {}) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        ...init
      })
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID', 'google-client-id');
  installGoogleIdentityStub();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete window.google;
});

describe('AuthenticatedCockpit', () => {
  it('renders Google sign-in before the operational Cockpit is authenticated', async () => {
    render(
      <MemoryRouter>
        <AuthenticatedCockpit />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.google?.accounts.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'google-client-id' })
    );
    expect(window.google?.accounts.id.renderButton).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('renders the Cockpit after Google Identity returns an ID token', async () => {
    const fetchImpl = fetchJson({
      generatedAt: '2026-08-28T16:04:00.000Z',
      summary: {
        generatedAt: '2026-08-28T16:04:00.000Z',
        signals: 0,
        watchlist: 0,
        ready: 0,
        activeTradePlans: 0,
        openPositions: 0,
        closedTrades: 0
      },
      account: {
        accountName: '',
        accountEquity: 0,
        defaultRiskPercent: 0,
        maxPositionPercent: 0,
        currency: 'CAD'
      },
      pipeline: {
        signals: 0,
        watchlist: 0,
        ready: 0,
        nearBreakout: 0,
        activeTradePlans: 0,
        openPositions: 0,
        closedTrades: 0
      },
      performance: {
        trades: 0,
        wins: 0,
        realizedPnl: 0,
        winRate: 0,
        averageR: 0,
        totalR: 0
      },
      topMomentum: [],
      watchlistPreview: [],
      openPositionsPreview: [],
      actions: { nearBreakout: [], ready: [], openPositions: [] }
    });
    vi.stubGlobal('fetch', fetchImpl);

    render(
      <MemoryRouter>
        <AuthenticatedCockpit />
      </MemoryRouter>
    );

    await waitFor(() => expect(credentialCallback).toBeTypeOf('function'));
    credentialCallback?.({ credential: 'id-token' });

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/dashboard',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer id-token' })
      })
    );
  });

  it('shows a configuration failure when the Google client ID is missing', async () => {
    vi.stubEnv('VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID', '');

    render(
      <MemoryRouter>
        <AuthenticatedCockpit />
      </MemoryRouter>
    );

    expect(await screen.findByText('Google OAuth client ID is missing.')).toBeInTheDocument();
  });
});
