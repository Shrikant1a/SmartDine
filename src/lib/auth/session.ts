import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPermission, hasRole } from "@/lib/auth/rbac";
import type { Permission, StaffRole } from "@/constants/roles";
import type { StaffMember } from "@/types/database";

export interface AuthenticatedStaffContext {
  userId: string;
  email: string;
  staff: StaffMember;
}

/**
 * Resolves the currently authenticated Supabase user and verifies they have an active staff record.
 * Returns null if unauthenticated or inactive/non-staff.
 */
export async function getCurrentStaffSession(): Promise<AuthenticatedStaffContext | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (staffError || !staff) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? staff.email,
    staff: staff as StaffMember,
  };
}

/**
 * Server Component guard: redirects to /login when unauthenticated or /unauthorized when role lacks access.
 */
export async function requireStaffRole(
  allowedRoles: readonly StaffRole[],
  loginRedirectTo = "/login",
): Promise<AuthenticatedStaffContext> {
  const session = await getCurrentStaffSession();
  if (!session) {
    redirect(loginRedirectTo);
  }
  if (!hasRole(session.staff.role, allowedRoles)) {
    redirect("/unauthorized");
  }
  return session;
}

/**
 * API / Server Action guard: throws typed error instead of redirecting.
 */
export class AuthorizationError extends Error {
  readonly statusCode: 401 | 403;
  constructor(message: string, statusCode: 401 | 403) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

export async function requireApiStaffPermission(
  permission: Permission,
): Promise<AuthenticatedStaffContext> {
  const session = await getCurrentStaffSession();
  if (!session) {
    throw new AuthorizationError("Authentication required", 401);
  }
  if (!hasPermission(session.staff.role, permission)) {
    throw new AuthorizationError("Insufficient permissions for this action", 403);
  }
  return session;
}
