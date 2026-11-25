/**
 * Live HTTP Negative-Security & Header Verification Script.
 * Verifies against a running SmartDine server (default http://localhost:3000):
 *  - Security headers present (nosniff, DENY, Referrer-Policy)
 *  - Protected staff pages redirect unauthenticated requests (307 -> /login)
 *  - Protected API endpoints reject unauthenticated requests (401)
 *  - Malformed QR tokens do not crash (no 500)
 */
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function assertSecurity() {
  // 1. Security Headers & Home 200
  const homeRes = await fetch(`${BASE_URL}/`);
  if (homeRes.status !== 200) {
    throw new Error(`Expected 200 on /, got ${homeRes.status}`);
  }
  const nosniff = homeRes.headers.get("x-content-type-options");
  const frameOpts = homeRes.headers.get("x-frame-options");
  const refPolicy = homeRes.headers.get("referrer-policy");
  if (nosniff !== "nosniff" || frameOpts !== "DENY" || !refPolicy) {
    throw new Error(
      `Missing security headers: nosniff=${nosniff}, x-frame-options=${frameOpts}, referrer-policy=${refPolicy}`,
    );
  }
  console.log("PASS: Security headers verified on /");

  // 2. Protected staff pages redirect unauthenticated users to /login
  const protectedPages = [
    "/admin",
    "/admin/menu",
    "/admin/categories",
    "/admin/tables",
    "/admin/staff",
    "/admin/orders",
    "/admin/reports",
    "/admin/feedback",
    "/admin/settings",
    "/kitchen",
    "/waiter",
  ];

  for (const path of protectedPages) {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    if (res.status !== 307 || !loc.includes("/login")) {
      throw new Error(
        `SECURITY FAILURE: ${path} returned ${res.status} (location: ${loc}) instead of 307 -> /login`,
      );
    }
  }
  console.log(`PASS: All ${protectedPages.length} protected staff pages redirect unauthenticated access -> /login`);

  // 3. Protected API routes reject unauthenticated callers with 401
  const protectedApis: Array<{ method: string; path: string; body?: string }> = [
    { method: "GET", path: "/api/admin/menu" },
    { method: "GET", path: "/api/admin/tables" },
    { method: "GET", path: "/api/admin/staff" },
    { method: "GET", path: "/api/admin/reports/csv" },
    { method: "GET", path: "/api/admin/settings" },
    { method: "GET", path: "/api/kitchen/orders" },
    { method: "GET", path: "/api/waiter/dashboard" },
    { method: "GET", path: "/api/orders" },
    { method: "GET", path: "/api/table/wifi" },
    { method: "POST", path: "/api/orders", body: "{}" },
    { method: "POST", path: "/api/waiter-calls", body: "{}" },
    { method: "POST", path: "/api/payments/create", body: "{}" },
    { method: "POST", path: "/api/payments/verify", body: "{}" },
    { method: "POST", path: "/api/reviews", body: "{}" },
    { method: "POST", path: "/api/notifications/daily-summary" },
  ];

  for (const ep of protectedApis) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: ep.body ? { "Content-Type": "application/json" } : undefined,
      body: ep.body,
    });
    if (res.status !== 401) {
      throw new Error(
        `SECURITY FAILURE: ${ep.method} ${ep.path} returned ${res.status} instead of 401`,
      );
    }
  }
  console.log(`PASS: All ${protectedApis.length} protected API endpoints return 401 unauthenticated`);

  // 4. Malformed QR lookup rejects cleanly with 400 (not 500)
  const badQrRes = await fetch(`${BASE_URL}/api/table/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "bad token!" }),
  });
  if (badQrRes.status !== 400) {
    throw new Error(`Expected 400 for malformed QR token, got ${badQrRes.status}`);
  }
  console.log("PASS: Malformed QR token rejected cleanly with 400");

  // 5. PWA manifest reachable
  const manifestRes = await fetch(`${BASE_URL}/manifest.webmanifest`);
  if (manifestRes.status !== 200) {
    throw new Error(`Expected 200 on /manifest.webmanifest, got ${manifestRes.status}`);
  }
  console.log("PASS: PWA manifest served cleanly");
}

assertSecurity().catch((err) => {
  console.error(err);
  process.exit(1);
});
