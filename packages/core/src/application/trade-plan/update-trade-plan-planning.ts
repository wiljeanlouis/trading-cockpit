import {
  updateTradePlanPlanning,
  type TradePlan,
  type TradePlanPlanningInputs
} from '../../domain/trade-plan';
import type { TradePlanRepository } from '../../ports/outbound/trade-plan-repository';

export interface UpdateTradePlanPlanningCommand extends TradePlanPlanningInputs {
  tradePlanId: string;
}

export type UpdateTradePlanPlanning = (command: UpdateTradePlanPlanningCommand) => TradePlan;

export function createUpdateTradePlanPlanning(
  repository: TradePlanRepository
): UpdateTradePlanPlanning {
  return (command) => {
    const tradePlanId = String(command.tradePlanId || '').trim();
    if (!tradePlanId) throw new Error('Trade Plan ID absent.');

    const current = repository.findById(tradePlanId);
    if (!current) throw new Error(`Trade Plan ID introuvable : ${tradePlanId}`);

    const updated = updateTradePlanPlanning(current, {
      entryPrice: command.entryPrice,
      stopPrice: command.stopPrice,
      targetPrice: command.targetPrice,
      positionSize: command.positionSize
    });
    repository.updatePlanning(updated, { positionSizeOverridden: command.positionSize !== null });
    return updated;
  };
}
