import { z } from "zod";
import { uuidSchema } from "@/lib/validation/common";

export const createPaymentOrderSchema = z.object({
  orderId: uuidSchema,
});

export const verifyPaymentSchema = z.object({
  orderId: uuidSchema,
  razorpayOrderId: z.string().trim().min(5).max(120),
  razorpayPaymentId: z.string().trim().min(5).max(120),
  razorpaySignature: z.string().trim().min(16).max(256),
});

export const refundOrderSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});
