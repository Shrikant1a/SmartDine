import { describe, expect, it } from "vitest";
import {
  normalizeWhatsAppPhone,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp/client";
import { submitReviewSchema } from "@/lib/validation/review";

describe("WhatsApp integration & customer review validation", () => {
  it("normalizes Indian mobile numbers and rejects invalid phone strings", () => {
    expect(normalizeWhatsAppPhone("9876543210")).toBe("919876543210");
    expect(normalizeWhatsAppPhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizeWhatsAppPhone("12345")).toBeNull();
  });

  it("reports skipped honestly when WhatsApp credentials are not configured", async () => {
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;

    const result = await sendWhatsAppTemplate({
      to: "9876543210",
      templateName: "smartdine_new_order",
      bodyParameters: ["SD-1001", "Table T1", "₹249"],
    });

    expect(result.status).toBe("skipped");
    expect(result.errorMessage).toContain("not configured");
  });

  it("validates 1-5 star review ratings and strips angle brackets", () => {
    expect(
      submitReviewSchema.safeParse({
        orderId: "11111111-1111-4111-8111-111111111111",
        rating: 6,
      }).success,
    ).toBe(false);

    const valid = submitReviewSchema.parse({
      orderId: "11111111-1111-4111-8111-111111111111",
      rating: 5,
      comment: "Great food <b>loved it</b>",
    });
    expect(valid.comment).toBe("Great food bloved it/b");
  });
});
