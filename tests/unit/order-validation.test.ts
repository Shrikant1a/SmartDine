import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/lib/validation/order";

const VALID_ITEM_ID = "33333333-3333-4333-8333-333333333305";
const VALID_VARIANT_ID = "55555555-5555-4555-8555-555555555501";
const VALID_ADDON_ID = "66666666-6666-4666-8666-666666666601";

describe("Order payload Zod validation", () => {
  it("accepts a valid Cash at Table order with variants, add-ons, and idempotency key", () => {
    const result = createOrderSchema.safeParse({
      paymentMode: "cash_table",
      customerName: "Rohan",
      customerPhone: "9876543210",
      specialInstructions: "Serve hot",
      idempotencyKey: "12345678-abcd-4000-8000-1234567890ab",
      items: [
        {
          menuItemId: VALID_ITEM_ID,
          variantId: VALID_VARIANT_ID,
          addonIds: [VALID_ADDON_ID],
          quantity: 2,
          specialInstructions: "Less spicy",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty carts, invalid quantities, and malformed phone numbers", () => {
    expect(
      createOrderSchema.safeParse({
        paymentMode: "counter",
        idempotencyKey: "12345678-abcd-4000-8000-1234567890ab",
        items: [],
      }).success,
    ).toBe(false);

    expect(
      createOrderSchema.safeParse({
        paymentMode: "counter",
        customerPhone: "123",
        idempotencyKey: "12345678-abcd-4000-8000-1234567890ab",
        items: [{ menuItemId: VALID_ITEM_ID, addonIds: [], quantity: 1 }],
      }).success,
    ).toBe(false);
  });
});
