import { describe, expect, it } from "vitest";
import { ownerBootstrapSchema, staffLoginSchema } from "@/lib/validation/auth";
import {
  indianPhoneSchema,
  qrTokenParamSchema,
  sanitizedTextSchema,
} from "@/lib/validation/common";

describe("Zod validation schemas", () => {
  it("validates staff login inputs", () => {
    expect(
      staffLoginSchema.safeParse({
        email: "owner@smartdine.in",
        password: "StrongPassword123",
      }).success,
    ).toBe(true);

    expect(
      staffLoginSchema.safeParse({
        email: "not-an-email",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("enforces owner bootstrap secret & strong password", () => {
    expect(
      ownerBootstrapSchema.safeParse({
        bootstrapSecret: "short",
        name: "Owner",
        email: "owner@smartdine.in",
        password: "StrongPassword123",
      }).success,
    ).toBe(false);

    expect(
      ownerBootstrapSchema.safeParse({
        bootstrapSecret: "valid-setup-secret-1234",
        name: "Aarav Sharma",
        email: "owner@smartdine.in",
        password: "StrongPassword123",
      }).success,
    ).toBe(true);
  });

  it("strips control chars and angle brackets from sanitized text", () => {
    const schema = sanitizedTextSchema(100);
    const parsed = schema.parse("  Less spicy <script>alert(1)</script>  ");
    expect(parsed).toBe("Less spicy scriptalert(1)/script");
  });

  it("validates Indian mobile numbers and QR token params", () => {
    expect(indianPhoneSchema.safeParse("9876543210").success).toBe(true);
    expect(indianPhoneSchema.safeParse("+919876543210").success).toBe(true);
    expect(indianPhoneSchema.safeParse("12345").success).toBe(false);

    expect(qrTokenParamSchema.safeParse("abcDEF123456_-7890").success).toBe(true);
    expect(qrTokenParamSchema.safeParse("bad token!").success).toBe(false);
  });
});
