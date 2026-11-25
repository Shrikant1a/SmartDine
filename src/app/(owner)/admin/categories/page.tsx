import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminMenuData } from "@/services/admin-server";
import { CategoriesManager } from "@/components/dashboard/CategoriesManager";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function CategoriesContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const { categories } = await getAdminMenuData(session.staff.restaurant_id);
  return <CategoriesManager initialCategories={categories} />;
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <CategoriesContent />
    </Suspense>
  );
}
