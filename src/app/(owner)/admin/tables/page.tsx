import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminTablesData } from "@/services/admin-server";
import { TablesQrManager } from "@/components/dashboard/TablesQrManager";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function TablesContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const tables = await getAdminTablesData(session.staff.restaurant_id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return <TablesQrManager initialTables={tables} siteUrl={siteUrl} />;
}

export default function AdminTablesPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <TablesContent />
    </Suspense>
  );
}
