import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeLogger } from '../../src/adapters/outbound/apps-script/runtime-logger';

afterEach(() => vi.restoreAllMocks());

describe('RuntimeLogger', () => {
  it('keeps a correlation id and safely serializes Error objects', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new RuntimeLogger('workflow', { runId: 'abc123', now: () => 100 });
    expect(() => logger.error('HTTP_FETCH', new TypeError('network failed'))).not.toThrow();
    expect(output.mock.calls[0][0]).toContain(
      '[TradingCockpit][workflow][abc123] ERROR stage="HTTP_FETCH"'
    );
    expect(output.mock.calls[0][0]).toContain('errorName="TypeError"');
    expect(output.mock.calls[0][0]).toContain('errorMessage="network failed"');
  });

  it('redacts secrets, authenticated URLs and auth fields', () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = new RuntimeLogger('refresh-market-signals', {
      runId: 'safe01',
      now: () => 100
    });
    logger.info('REQUEST', {
      token: 'SECRET_TOKEN',
      authenticatedUrl: 'https://example.test?auth=SECRET_TOKEN',
      authPresent: true,
      provider: 'FINVIZ'
    });
    const message = String(output.mock.calls[0][0]);
    expect(message).not.toContain('SECRET_TOKEN');
    expect(message).not.toContain('https://');
    expect(message).toContain('provider="FINVIZ"');
  });
});
