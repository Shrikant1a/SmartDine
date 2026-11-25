import { describe, expect, it } from "vitest";
import {
  evaluateWaiterCallCooldown,
  WAITER_CALL_COOLDOWN_SECONDS,
} from "@/services/waiter";

describe("Waiter call cooldown and spam protection", () => {
  it("allows first call when no open call or recent call exists", () => {
    const res = evaluateWaiterCallCooldown(null, false);
    expect(res.allowed).toBe(true);
    expect(res.retryAfterSeconds).toBe(0);
  });

  it("blocks duplicate calls while an open call exists", () => {
    const res = evaluateWaiterCallCooldown(new Date().toISOString(), true);
    expect(res.allowed).toBe(false);
    expect(res.retryAfterSeconds).toBe(WAITER_CALL_COOLDOWN_SECONDS);
  });

  it("enforces cooldown window after a resolved recent call", () => {
    const now = Date.now();
    const thirtySecondsAgo = new Date(now - 30_000).toISOString();
    const resBlocked = evaluateWaiterCallCooldown(thirtySecondsAgo, false, now);
    expect(resBlocked.allowed).toBe(false);
    expect(resBlocked.retryAfterSeconds).toBe(90);

    const threeMinutesAgo = new Date(now - 180_000).toISOString();
    const resAllowed = evaluateWaiterCallCooldown(threeMinutesAgo, false, now);
    expect(resAllowed.allowed).toBe(true);
  });
});
