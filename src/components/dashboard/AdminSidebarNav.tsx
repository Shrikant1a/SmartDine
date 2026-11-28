"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  ChefHat,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  MessageSquareHeart,
  QrCode,
  Settings,
  Users,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffRole } from "@/constants/roles";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, ownerOnly: false },
  { href: "/admin/kitchen", label: "Kitchen Display", icon: ChefHat, ownerOnly: false },
  { href: "/admin/waiter", label: "Waiter Portal", icon: BellRing, ownerOnly: false },
  { href: "/admin/menu", label: "Menu Items", icon: Utensils, ownerOnly: false },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, ownerOnly: false },
  { href: "/admin/tables", label: "Tables & QR", icon: QrCode, ownerOnly: false },
  { href: "/admin/staff", label: "Staff", icon: Users, ownerOnly: false },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, ownerOnly: false },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareHeart, ownerOnly: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, ownerOnly: true },
] as const;

export function AdminSidebarNav({
  role,
  orientation = "vertical",
}: {
  role: StaffRole;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.ownerOnly || role === "owner",
  );

  if (orientation === "horizontal") {
    return (
      <nav className="flex gap-1.5 overflow-x-auto px-4 py-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-amber-600 text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-amber-600/10 text-amber-800 dark:text-amber-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
