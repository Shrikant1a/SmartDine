import { Suspense } from "react";
import { ChefHat } from "lucide-react";
import { requireStaffRole } from "@/lib/auth/session";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { StaffSignOutButton } from "@/components/shared/StaffSignOutButton";

async function KitchenGuard({ children }: { children: React.ReactNode }) {
  const session = await requireStaffRole(["owner", "manager", "kitchen"]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                SmartDine Kitchen Display
              </h1>
              <p className="text-xs text-slate-400">
                Signed in as {session.staff.name}
              </p>
            </div>
            <RoleBadge role={session.staff.role} />
          </div>
          <StaffSignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <KitchenGuard>{children}</KitchenGuard>
    </Suspense>
  );
}
