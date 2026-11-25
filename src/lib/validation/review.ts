import { z } from "zod";
import { sanitizedTextSchema, uuidSchema } from "@/lib/validation/common";

export const submitReviewSchema = z.object({
  orderId: uuidSchema,
  rating: z.number().int().min(1, "Please select a rating between 1 and 5").max(5),
  comment: sanitizedTextSchema(600).optional().or(z.literal("")),
});

export const googleClickSchema = z.object({
  orderId: uuidSchema,
});

export const updateReviewEditFlagSchema = z.object({
  allowEdit: z.boolean(),
});
