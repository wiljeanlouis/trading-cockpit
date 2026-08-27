import { InMemoryGreetingRepository } from '../adapters/in-memory-greeting-repository';
import { createGreeting } from '../core/create-greeting';

export function runArchitecturePoc(): string {
  const repository = new InMemoryGreetingRepository('Modular TypeScript');

  return createGreeting(repository);
}
