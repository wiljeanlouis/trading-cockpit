import { setupMomentumRankingInSheets } from '../adapters/inbound/google-sheets/setup-momentum-ranking';
import {
  setupStrategiesInSheets,
  validateStrategiesInSheets
} from '../adapters/inbound/google-sheets/setup-strategies';

export function runSetupMomentumRanking(): void {
  setupMomentumRankingInSheets();
}

export function runSetupStrategies(): void {
  setupStrategiesInSheets();
}

export function runValidateStrategies(): true {
  return validateStrategiesInSheets();
}
