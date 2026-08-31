import type {
  UpdateTradePlanPlanningRequest,
  UpdateTradePlanPlanningResponse
} from '@trading-cockpit/contracts';
import type { UpdateTradePlanPlanning } from '@trading-cockpit/core/application/trade-plan/update-trade-plan-planning';

export function updateTradePlanPlanningFromWeb(
  updatePlanning: UpdateTradePlanPlanning,
  request: UpdateTradePlanPlanningRequest
): UpdateTradePlanPlanningResponse {
  const targetText = String(request?.targetPrice ?? '').trim();
  const positionSizeText = String(request?.positionSize ?? '').trim();
  const tradePlan = updatePlanning({
    tradePlanId: String(request?.tradePlanId ?? ''),
    entryPrice: Number(request?.entryPrice),
    stopPrice: Number(request?.stopPrice),
    targetPrice: targetText ? Number(request.targetPrice) : null,
    positionSize: positionSizeText ? Number(request.positionSize) : null
  });
  return { tradePlanId: tradePlan.id, status: tradePlan.status };
}
