import { describe, expect, it } from 'vitest';
import { InMemoryGreetingRepository } from '../../src/poc/adapters/in-memory-greeting-repository';
import { createGreeting } from '../../src/poc/core/create-greeting';
import type { GreetingRepository } from '../../src/poc/ports/greeting-repository';

describe('createGreeting', () => {
  it('uses the port contract without knowing the adapter', () => {
    const repository: GreetingRepository = {
      findName: () => 'Core Test'
    };

    expect(createGreeting(repository)).toBe('Hello, Core Test!');
  });

  it('works with the in-memory adapter', () => {
    const repository = new InMemoryGreetingRepository('Adapter Test');

    expect(createGreeting(repository)).toBe('Hello, Adapter Test!');
  });
});
