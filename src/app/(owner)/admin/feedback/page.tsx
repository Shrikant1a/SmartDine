import { Suspense } from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { getAdminFeedbackAndNotificationsData } from "@/services/admin-server";
import { isWhatsAppConfigured } from "@/lib/whatsapp/client";
import { FeedbackInboxManager } from "@/components/dashboard/FeedbackInboxManager";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";

async function FeedbackContent() {
  const session = await requireStaffRole(["owner", "manager"]);
  const { reviews, notifications } = await getAdminFeedbackAndNotificationsData(
    session.staff.restaurant_id,
  );

  return (
    <FeedbackInboxManager
      initialReviews={reviews}
      initialNotifications={notifications}
      isOwner={session.staff.role === "owner"}
      whatsappConfigured={isWhatsAppConfigured()}
    />
  );
}

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <FeedbackContent />
    </Suspense>
  );
}
