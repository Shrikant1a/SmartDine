-- ==============================================================================
-- SmartDine Migration 0007: Security Revocations & Foreign-Key Covering Indexes
-- ==============================================================================

-- Revoke direct RPC execution of privileged SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.enforce_order_status_transition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_atomic(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.current_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_staff_restaurant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_restaurant_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active_staff(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_staff(TEXT[]) TO authenticated;

-- Covering indexes for remaining foreign keys
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_id ON public.audit_logs (staff_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON public.notification_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_assigned_waiter_id ON public.restaurant_tables (assigned_waiter_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_acknowledged_by ON public.waiter_calls (acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_resolved_by ON public.waiter_calls (resolved_by);
