import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitForTests } from "@/lib/security/rate-limit";

describe("Sliding-window rate limiter", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  it("permits requests under the threshold and blocks excess requests", () => {
    const r1 = checkRateLimit("table:T1:call", 2, 60_000);
    const r2 = checkRateLimit("table:T1:call", 2, 60_000);
    const r3 = checkRateLimit("table:T1:call", 2, 60_000);

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);
    expect(r3.allowed).toBe(false);
    expect(r3.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
