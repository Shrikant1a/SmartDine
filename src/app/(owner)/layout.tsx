import { Suspense } from "react";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { requireStaffRole } from "@/lib/auth/session";
import { PageShellSkeleton } from "@/components/shared/PageShellSkeleton";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { StaffSignOutButton } from "@/components/shared/StaffSignOutButton";
import { AdminSidebarNav } from "@/components/dashboard/AdminSidebarNav";

async function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = await requireStaffRole(["owner", "manager"]);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <Link href="/admin" className="text-sm font-bold tracking-tight">
              SmartDine Admin
            </Link>
            <p className="text-[11px] text-muted-foreground">Restaurant Console</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AdminSidebarNav role={session.staff.role} />
        </div>
        <div className="border-t p-4 text-xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="truncate">
              <p className="truncate font-medium text-foreground">{session.staff.name}</p>
              <p className="truncate text-muted-foreground">{session.email}</p>
            </div>
            <RoleBadge role={session.staff.role} />
          </div>
          <StaffSignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="border-b bg-card md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">SmartDine Admin</span>
              <RoleBadge role={session.staff.role} />
            </div>
            <StaffSignOutButton />
          </div>
          <div className="border-t">
            <AdminSidebarNav role={session.staff.role} orientation="horizontal" />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function OwnerAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <AdminGuard>{children}</AdminGuard>
    </Suspense>
  );
}
