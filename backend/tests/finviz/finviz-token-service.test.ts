import { describe, expect, it, vi } from 'vitest';
import {
  FinvizTokenService,
  type FinvizTokenStorage
} from '../../src/adapters/outbound/finviz/finviz-token-service';

function storage(value: string | null): FinvizTokenStorage {
  return { get: vi.fn(() => value), set: vi.fn(), delete: vi.fn() };
}

describe('Finviz token infrastructure', () => {
  it('normalizes token without exposing it to Core', () => {
    const backing = storage(' secret ');
    const service = new FinvizTokenService(backing);
    expect(service.getToken()).toBe('secret');
    service.setToken(' replacement ');
    expect(backing.set).toHaveBeenCalledWith('replacement');
  });

  it('preserves token errors and configured semantics', () => {
    expect(() => new FinvizTokenService(storage(' ')).getToken()).toThrow(
      'Token Finviz absent. Utilise Trading Cockpit > Configurer Finviz Token.'
    );
    expect(() => new FinvizTokenService(storage(null)).setToken(' ')).toThrow(
      'Le token Finviz ne peut pas être vide.'
    );
    expect(new FinvizTokenService(storage(' token ')).isConfigured()).toBe(true);
  });

  it('delegates deletion to vendor storage', () => {
    const backing = storage('token');
    new FinvizTokenService(backing).deleteToken();
    expect(backing.delete).toHaveBeenCalledOnce();
  });
});
