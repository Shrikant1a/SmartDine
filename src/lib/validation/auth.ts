import { z } from "zod";
import { STAFF_ROLES } from "@/constants/roles";

export const staffLoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid staff email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const ownerBootstrapSchema = z.object({
  bootstrapSecret: z.string().min(12, "Bootstrap setup secret is required"),
  name: z
    .string()
    .trim()
    .min(2, "Owner name must be at least 2 characters")
    .max(80, "Owner name is too long"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password is too long"),
  restaurantName: z
    .string()
    .trim()
    .min(2, "Restaurant name must be at least 2 characters")
    .max(120)
    .optional(),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  role: z.enum(STAFF_ROLES),
  password: z.string().min(10).max(128),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type OwnerBootstrapInput = z.infer<typeof ownerBootstrapSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
