import { z } from "zod";
import { ORDER_STATUSES } from "@/constants/roles";

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  cancelReason: z.string().trim().max(200).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
