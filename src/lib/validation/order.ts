import { z } from "zod";
import { PAYMENT_MODES } from "@/constants/roles";
import {
  indianPhoneSchema,
  qrTokenParamSchema,
  sanitizedTextSchema,
  uuidSchema,
} from "@/lib/validation/common";

export const resolveTableSchema = z.object({
  token: qrTokenParamSchema,
});

export const orderItemInputSchema = z.object({
  menuItemId: uuidSchema,
  variantId: uuidSchema.nullable().optional(),
  addonIds: z.array(uuidSchema).max(20).default([]),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Max 50 per item"),
  specialInstructions: sanitizedTextSchema(200).optional(),
});

export const createOrderSchema = z.object({
  paymentMode: z.enum(PAYMENT_MODES),
  customerName: sanitizedTextSchema(80).optional(),
  customerPhone: indianPhoneSchema.optional().or(z.literal("")),
  whatsappConsent: z.boolean().default(false),
  specialInstructions: sanitizedTextSchema(300).optional(),
  idempotencyKey: z.string().trim().min(8).max(128),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Your cart is empty")
    .max(50, "Too many distinct items in one order"),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
