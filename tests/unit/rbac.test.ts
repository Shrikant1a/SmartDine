import { describe, expect, it } from "vitest";
import {
  canAccessRoutePrefix,
  getHomeRouteForRole,
  hasPermission,
  hasRole,
} from "@/lib/auth/rbac";

describe("RBAC permissions and route guards", () => {
  it("enforces role checks accurately", () => {
    expect(hasRole("owner", ["owner", "manager"])).toBe(true);
    expect(hasRole("kitchen", ["owner", "manager"])).toBe(false);
    expect(hasRole("waiter", ["owner", "manager", "waiter"])).toBe(true);
  });

  it("restricts sensitive permissions to owner", () => {
    expect(hasPermission("owner", "staff:manage")).toBe(true);
    expect(hasPermission("owner", "payments:refund")).toBe(true);
    expect(hasPermission("owner", "audit:view")).toBe(true);

    expect(hasPermission("manager", "staff:manage")).toBe(false);
    expect(hasPermission("manager", "payments:refund")).toBe(false);
    expect(hasPermission("manager", "menu:manage")).toBe(true);

    expect(hasPermission("kitchen", "orders:prepare")).toBe(true);
    expect(hasPermission("kitchen", "orders:serve")).toBe(false);
    expect(hasPermission("kitchen", "payments:view")).toBe(false);

    expect(hasPermission("waiter", "orders:serve")).toBe(true);
    expect(hasPermission("waiter", "waiter_calls:resolve")).toBe(true);
    expect(hasPermission("waiter", "orders:prepare")).toBe(false);
    expect(hasPermission("waiter", "menu:manage")).toBe(false);
  });

  it("maps each role to the right portal route", () => {
    expect(getHomeRouteForRole("owner")).toBe("/admin");
    expect(getHomeRouteForRole("manager")).toBe("/admin");
    expect(getHomeRouteForRole("kitchen")).toBe("/kitchen");
    expect(getHomeRouteForRole("waiter")).toBe("/waiter");
  });

  it("prevents cross-role portal access", () => {
    expect(canAccessRoutePrefix("kitchen", "/kitchen")).toBe(true);
    expect(canAccessRoutePrefix("kitchen", "/admin")).toBe(false);
    expect(canAccessRoutePrefix("kitchen", "/waiter")).toBe(false);

    expect(canAccessRoutePrefix("waiter", "/waiter")).toBe(true);
    expect(canAccessRoutePrefix("waiter", "/kitchen")).toBe(false);
    expect(canAccessRoutePrefix("waiter", "/admin")).toBe(false);

    expect(canAccessRoutePrefix("owner", "/admin/settings")).toBe(true);
    expect(canAccessRoutePrefix("owner", "/kitchen")).toBe(true);
    expect(canAccessRoutePrefix("owner", "/waiter")).toBe(true);
  });
});
