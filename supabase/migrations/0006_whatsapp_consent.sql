-- ==============================================================================
-- SmartDine Migration 0006: Customer WhatsApp Consent Flag on Orders
-- ==============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN NOT NULL DEFAULT false;
