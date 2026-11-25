export const WAITER_CALL_COOLDOWN_SECONDS = 120;

/**
 * Computes whether a new waiter call for a table is allowed given its latest call timestamp.
 */
export function evaluateWaiterCallCooldown(
  lastCallCreatedAtIso: string | null,
  hasOpenCall: boolean,
  nowMs = Date.now(),
): { allowed: boolean; retryAfterSeconds: number; reason?: string } {
  if (hasOpenCall) {
    return {
      allowed: false,
      retryAfterSeconds: WAITER_CALL_COOLDOWN_SECONDS,
      reason: "A waiter has already been notified for your table and is on the way.",
    };
  }

  if (!lastCallCreatedAtIso) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const lastMs = new Date(lastCallCreatedAtIso).getTime();
  if (Number.isNaN(lastMs)) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const elapsedSec = Math.floor((nowMs - lastMs) / 1000);
  if (elapsedSec < WAITER_CALL_COOLDOWN_SECONDS) {
    const remaining = Math.max(1, WAITER_CALL_COOLDOWN_SECONDS - elapsedSec);
    return {
      allowed: false,
      retryAfterSeconds: remaining,
      reason: `Please wait ${remaining}s before sending another waiter call.`,
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
