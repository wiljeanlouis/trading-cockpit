import {
  migrateMomentumRankingToDataSheet,
  setupMomentumRankingInSheets
} from '../adapters/inbound/google-sheets/ui/setup-momentum-ranking';
import {
  setupStrategiesInSheets,
  validateStrategiesInSheets
} from '../adapters/inbound/google-sheets/ui/setup-strategies';

export function runSetupMomentumRanking(): void {
  setupMomentumRankingInSheets();
}

export function runMigrateMomentumRankingToDataSheet() {
  return migrateMomentumRankingToDataSheet();
}

export function runSetupStrategies(): void {
  setupStrategiesInSheets();
}

export function runValidateStrategies(): true {
  return validateStrategiesInSheets();
}
