import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid identifier format");

export const sanitizedTextSchema = (maxLen = 300) =>
  z
    .string()
    .trim()
    .max(maxLen, `Text must be ${maxLen} characters or fewer`)
    .transform((val) => val.replace(/[\u0000-\u001F\u007F<>]/g, ""));

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const qrTokenParamSchema = z
  .string()
  .trim()
  .min(16, "Invalid table QR token")
  .max(256, "Invalid table QR token")
  .regex(/^[A-Za-z0-9_-]+$/, "Malformed QR token");
