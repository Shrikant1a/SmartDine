import { z } from "zod";
import { STAFF_ROLES } from "@/constants/roles";
import { sanitizedTextSchema, uuidSchema } from "@/lib/validation/common";

export const categoryInputSchema = z.object({
  name: sanitizedTextSchema(80).pipe(z.string().min(2, "Category name is required")),
  description: sanitizedTextSchema(240).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const variantInputSchema = z.object({
  id: uuidSchema.optional(),
  name: sanitizedTextSchema(60).pipe(z.string().min(1, "Variant name required")),
  price: z.number().min(0).max(100000),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

export const addonInputSchema = z.object({
  id: uuidSchema.optional(),
  name: sanitizedTextSchema(60).pipe(z.string().min(1, "Add-on name required")),
  price: z.number().min(0).max(100000),
  isAvailable: z.boolean().default(true),
});

export const menuItemInputSchema = z.object({
  categoryId: uuidSchema,
  name: sanitizedTextSchema(120).pipe(z.string().min(2, "Item name is required")),
  description: sanitizedTextSchema(500).optional().or(z.literal("")),
  imageUrl: z.string().trim().url("Must be a valid image URL").optional().or(z.literal("")),
  basePrice: z.number().min(0, "Price must be >= 0").max(100000),
  gstPercent: z.number().min(0).max(28).default(5),
  isVeg: z.boolean().default(true),
  isRecommended: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  stockQty: z.number().int().min(0).max(10000).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).default(5),
  prepTimeMins: z.number().int().min(1).max(180).default(15),
  variants: z.array(variantInputSchema).max(15).default([]),
  addons: z.array(addonInputSchema).max(20).default([]),
});

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const tableCreateSchema = z.object({
  tableNumber: sanitizedTextSchema(20).pipe(z.string().min(1, "Table number is required")),
  label: sanitizedTextSchema(60).optional().or(z.literal("")),
  capacity: z.number().int().min(1).max(50).default(4),
});

export const tableUpdateSchema = z.object({
  tableNumber: sanitizedTextSchema(20).pipe(z.string().min(1)).optional(),
  label: sanitizedTextSchema(60).optional().or(z.literal("")),
  capacity: z.number().int().min(1).max(50).optional(),
  status: z.enum(["available", "occupied", "reserved", "inactive"]).optional(),
  isActive: z.boolean().optional(),
});

export const staffUpdateSchema = z.object({
  name: sanitizedTextSchema(80).pipe(z.string().min(2)).optional(),
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
});

export const restaurantSettingsSchema = z.object({
  name: sanitizedTextSchema(120).pipe(z.string().min(2)),
  description: sanitizedTextSchema(400).optional().or(z.literal("")),
  address: sanitizedTextSchema(240).optional().or(z.literal("")),
  phone: sanitizedTextSchema(25).optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Invalid logo URL").optional().or(z.literal("")),
  gstNumber: sanitizedTextSchema(30).optional().or(z.literal("")),
  defaultGstPercent: z.number().min(0).max(28),
  serviceChargePercent: z.number().min(0).max(20),
  wifiSsid: sanitizedTextSchema(80).optional().or(z.literal("")),
  wifiPassword: sanitizedTextSchema(80).optional().or(z.literal("")),
  googleReviewUrl: z.string().trim().url("Invalid Google Review URL").optional().or(z.literal("")),
  ownerWhatsapp: sanitizedTextSchema(20).optional().or(z.literal("")),
  kitchenWhatsapp: sanitizedTextSchema(20).optional().or(z.literal("")),
  isOpen: z.boolean(),
});

export const markPaymentPaidSchema = z.object({
  paymentStatus: z.enum(["paid", "refunded"]),
});
