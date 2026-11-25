import { Suspense } from "react";
import { Settings } from "lucide-react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminRestaurantSettings } from "@/services/admin-server";
import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function OwnerSettingsContent() {
  const session = await requireStaffRole(["owner"]);
  const restaurant = await getAdminRestaurantSettings(
    session.staff.restaurant_id,
  );

  if (!restaurant) {
    return (
      <EmptyState
        icon={Settings}
        title="Restaurant profile not found"
        description="Run database seeding or bootstrap to initialize restaurant settings."
      />
    );
  }

  return <SettingsManager restaurant={restaurant} />;
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <OwnerSettingsContent />
    </Suspense>
  );
}
