import "server-only";
import { z } from "zod";
import { clientEnvSchema } from "@/lib/env";

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, "SUPABASE_SERVICE_ROLE_KEY is required"),
  QR_TOKEN_SECRET: z
    .string()
    .min(16, "QR_TOKEN_SECRET must be at least 16 characters"),
  TABLE_SESSION_SECRET: z
    .string()
    .min(16, "TABLE_SESSION_SECRET must be at least 16 characters"),
  OWNER_BOOTSTRAP_SECRET: z.string().min(12).optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates server-only environment variables. Strictly server-only.
 */
export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    QR_TOKEN_SECRET: process.env.QR_TOKEN_SECRET,
    TABLE_SESSION_SECRET: process.env.TABLE_SESSION_SECRET,
    OWNER_BOOTSTRAP_SECRET: process.env.OWNER_BOOTSTRAP_SECRET || undefined,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || undefined,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || undefined,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || undefined,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || undefined,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || undefined,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid server environment configuration: ${details}`);
  }
  return parsed.data;
}

/**
 * Non-throwing status check used by /api/health.
 */
export function getEnvDiagnostics() {
  const supabasePublicReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const supabaseAdminReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const securitySecretsReady = Boolean(
    process.env.QR_TOKEN_SECRET && process.env.TABLE_SESSION_SECRET,
  );

  return {
    supabasePublicReady,
    supabaseAdminReady,
    securitySecretsReady,
    razorpayConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_WEBHOOK_SECRET,
    ),
    whatsappConfigured: Boolean(
      process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
    ),
  };
}
