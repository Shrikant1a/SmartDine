import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { requireStaffRole } from "@/lib/auth/session";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { StaffSignOutButton } from "@/components/shared/StaffSignOutButton";

async function WaiterGuard({ children }: { children: React.ReactNode }) {
  const session = await requireStaffRole(["owner", "manager", "waiter"]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-5 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                SmartDine Waiter Portal
              </h1>
              <p className="text-xs text-muted-foreground">
                {session.staff.name}
              </p>
            </div>
            <RoleBadge role={session.staff.role} />
          </div>
          <StaffSignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-5">{children}</main>
    </div>
  );
}

export default function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <WaiterGuard>{children}</WaiterGuard>
    </Suspense>
  );
}
