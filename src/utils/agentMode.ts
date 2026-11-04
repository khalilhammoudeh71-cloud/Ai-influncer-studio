export function agentEscalationLabel(attemptCount?: number): string {
  return typeof attemptCount === 'number' && attemptCount > 1
    ? ` · ${attemptCount} tiers`
    : '';
}

export function agentCostLabel(costUsd?: number): string {
  return typeof costUsd === 'number'
    ? ` · est. $${costUsd.toFixed(5)}`
    : '';
}
