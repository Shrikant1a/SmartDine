import { describe, expect, it } from "vitest";
import {
  canStaffTransitionOrder,
  getElapsedInfo,
  matchesTimeFilter,
} from "@/services/kitchen";

describe("KDS state transitions and role authorization", () => {
  it("allows kitchen staff only new -> preparing -> ready", () => {
    expect(canStaffTransitionOrder("kitchen", "new", "preparing").allowed).toBe(true);
    expect(canStaffTransitionOrder("kitchen", "preparing", "ready").allowed).toBe(true);
    expect(canStaffTransitionOrder("kitchen", "ready", "served").allowed).toBe(false);
    expect(canStaffTransitionOrder("kitchen", "new", "ready").allowed).toBe(false);
    expect(canStaffTransitionOrder("kitchen", "new", "cancelled").allowed).toBe(false);
  });

  it("allows waiter role only ready -> served", () => {
    expect(canStaffTransitionOrder("waiter", "ready", "served").allowed).toBe(true);
    expect(canStaffTransitionOrder("waiter", "new", "preparing").allowed).toBe(false);
    expect(canStaffTransitionOrder("waiter", "preparing", "ready").allowed).toBe(false);
  });

  it("allows owner and manager full valid lifecycle transitions", () => {
    expect(canStaffTransitionOrder("owner", "new", "preparing").allowed).toBe(true);
    expect(canStaffTransitionOrder("owner", "ready", "served").allowed).toBe(true);
    expect(canStaffTransitionOrder("manager", "new", "cancelled").allowed).toBe(true);
    expect(canStaffTransitionOrder("owner", "served", "new").allowed).toBe(false);
  });

  it("classifies elapsed order urgency accurately", () => {
    const now = Date.now();
    expect(getElapsedInfo(new Date(now - 3 * 60_000).toISOString(), now).severity).toBe(
      "normal",
    );
    expect(getElapsedInfo(new Date(now - 12 * 60_000).toISOString(), now).severity).toBe(
      "warning",
    );
    expect(getElapsedInfo(new Date(now - 25 * 60_000).toISOString(), now).severity).toBe(
      "urgent",
    );
  });

  it("filters orders by time window accurately", () => {
    const now = new Date("2026-11-25T14:30:00+05:30").getTime();
    const tenMinsAgo = new Date(now - 10 * 60_000).toISOString();
    const fortyMinsAgo = new Date(now - 40 * 60_000).toISOString();
    const yesterday = new Date(now - 24 * 60 * 60_000).toISOString();

    expect(matchesTimeFilter(tenMinsAgo, "15m", now)).toBe(true);
    expect(matchesTimeFilter(fortyMinsAgo, "15m", now)).toBe(false);
    expect(matchesTimeFilter(fortyMinsAgo, "1h", now)).toBe(true);
    expect(matchesTimeFilter(yesterday, "today", now)).toBe(false);
    expect(matchesTimeFilter(yesterday, "all", now)).toBe(true);
  });
});
