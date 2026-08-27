import type { GreetingRepository } from '../ports/greeting-repository';

export class InMemoryGreetingRepository implements GreetingRepository {
  constructor(private readonly name: string) {}

  findName(): string {
    return this.name;
  }
}
