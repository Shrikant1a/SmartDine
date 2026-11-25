import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminStaffData } from "@/services/admin-server";
import { StaffManager } from "@/components/dashboard/StaffManager";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function StaffContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const { staff, auditLogs } = await getAdminStaffData(
    session.staff.restaurant_id,
  );

  return (
    <StaffManager
      initialStaff={staff}
      auditLogs={session.staff.role === "owner" ? auditLogs : []}
      isOwner={session.staff.role === "owner"}
      currentStaffId={session.staff.id}
    />
  );
}

export default function AdminStaffPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}
