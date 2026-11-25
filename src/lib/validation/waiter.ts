import { z } from "zod";
import { WAITER_CALL_STATUSES } from "@/constants/roles";
import { sanitizedTextSchema } from "@/lib/validation/common";

export const createWaiterCallSchema = z.object({
  note: sanitizedTextSchema(160).optional(),
});

export const updateWaiterCallSchema = z.object({
  status: z.enum(WAITER_CALL_STATUSES),
});
