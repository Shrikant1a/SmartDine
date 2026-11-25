import { describe, expect, it } from "vitest";
import {
  generateRawQrToken,
  hashQrToken,
  signTableSession,
  verifyTableSession,
} from "@/lib/security/qr";

const QR_SECRET = "test-qr-secret-at-least-32-chars-long";
const SESSION_SECRET = "test-session-secret-at-least-32-chars";

describe("QR token hashing and table session signing", () => {
  it("generates high-entropy unique URL-safe tokens", () => {
    const t1 = generateRawQrToken();
    const t2 = generateRawQrToken();
    expect(t1.length).toBeGreaterThanOrEqual(32);
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes QR tokens deterministically with HMAC-SHA256", () => {
    const raw = generateRawQrToken();
    const h1 = hashQrToken(raw, QR_SECRET);
    const h2 = hashQrToken(raw, QR_SECRET);
    const hOther = hashQrToken(raw, "different-secret-at-least-32-chars!!");

    expect(h1).toHaveLength(64);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(raw);
    expect(h1).not.toBe(hOther);
  });

  it("signs and verifies a valid table session cookie", () => {
    const token = signTableSession(
      {
        tableId: "44444444-4444-4444-8444-444444444401",
        restaurantId: "11111111-1111-4111-8111-111111111111",
        tableNumber: "T1",
        tokenVersion: 1,
      },
      SESSION_SECRET,
      300,
    );

    const decoded = verifyTableSession(token, SESSION_SECRET);
    expect(decoded).not.toBeNull();
    expect(decoded?.tableNumber).toBe("T1");
    expect(decoded?.tokenVersion).toBe(1);
  });

  it("rejects tampered, wrong-secret, and expired table sessions", () => {
    const valid = signTableSession(
      {
        tableId: "44444444-4444-4444-8444-444444444401",
        restaurantId: "11111111-1111-4111-8111-111111111111",
        tableNumber: "T1",
        tokenVersion: 1,
      },
      SESSION_SECRET,
      300,
    );

    const tampered = `${valid.slice(0, -2)}xx`;
    expect(verifyTableSession(tampered, SESSION_SECRET)).toBeNull();
    expect(verifyTableSession(valid, "wrong-secret-key-1234567890")).toBeNull();

    const expired = signTableSession(
      {
        tableId: "44444444-4444-4444-8444-444444444401",
        restaurantId: "11111111-1111-4111-8111-111111111111",
        tableNumber: "T1",
        tokenVersion: 1,
      },
      SESSION_SECRET,
      -10,
    );
    expect(verifyTableSession(expired, SESSION_SECRET)).toBeNull();
  });
});
