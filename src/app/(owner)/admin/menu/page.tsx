import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminMenuData } from "@/services/admin-server";
import { MenuManager } from "@/components/dashboard/MenuManager";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function MenuContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const { categories, items } = await getAdminMenuData(session.staff.restaurant_id);
  return <MenuManager categories={categories} initialItems={items} />;
}

export default function AdminMenuPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}
