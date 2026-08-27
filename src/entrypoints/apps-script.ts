import {
  runAddSelectedToWatchlist,
  runCreateTradePlanFromSelectedWatchlist
} from '../composition/cockpit';

export function addSelectedToWatchlist(): void {
  runAddSelectedToWatchlist();
}

export function createTradePlanFromSelectedWatchlist(): void {
  runCreateTradePlanFromSelectedWatchlist();
}
