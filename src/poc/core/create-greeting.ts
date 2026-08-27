import { formatGreeting } from './domain';
import type { GreetingRepository } from '../ports/greeting-repository';

export function createGreeting(repository: GreetingRepository): string {
  return formatGreeting(repository.findName());
}
