"use client";

import { memo } from "react";
import {
  Bell,
  BookOpen,
  MapPin,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { useCartStore } from "@/hooks/useCartStore";
import { CUSTOMER_TRANSLATIONS, type Language } from "@/lib/i18n/customer";

export type CustomerTab = "menu" | "cart" | "track" | "bill" | "service";

interface CustomerBottomNavProps {
  activeTab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  lang: Language;
  hasActiveOrders?: boolean;
}

export const CustomerBottomNav = memo(function CustomerBottomNav({
  activeTab,
  onTabChange,
  lang,
  hasActiveOrders = false,
}: CustomerBottomNavProps) {
  const t = CUSTOMER_TRANSLATIONS[lang];
  const items = useCartStore((s) => s.items);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const tabs: Array<{
    id: CustomerTab;
    label: string;
    icon: typeof BookOpen;
    badge?: number;
    hasIndicator?: boolean;
  }> = [
    {
      id: "menu",
      label: t.menu,
      icon: BookOpen,
    },
    {
      id: "cart",
      label: cartCount > 0 ? `${t.cart} (${cartCount})` : t.cart,
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      id: "track",
      label: t.track,
      icon: MapPin,
      hasIndicator: hasActiveOrders,
    },
    {
      id: "bill",
      label: t.bill,
      icon: Receipt,
    },
    {
      id: "service",
      label: t.service,
      icon: Bell,
    },
  ];

  return (
    <nav
      aria-label="Customer Navigation Bar"
      className="fixed inset-x-0 bottom-0 z-50 select-none border-t border-slate-800/90 bg-slate-950/95 shadow-2xl backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5 items-center px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition-all duration-150 active:scale-95 ${
                isActive
                  ? "text-amber-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <IconComponent
                  className={`h-5 w-5 transition-transform duration-150 ${
                    isActive ? "scale-110 text-amber-500" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />

                {/* Cart Badge */}
                {tab.badge !== undefined && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-slate-950 animate-in zoom-in-75">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}

                {/* Live orders pulse dot */}
                {tab.hasIndicator && (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>

              <span
                className={`truncate text-[11px] leading-tight ${
                  isActive ? "font-semibold text-white" : "font-medium"
                }`}
              >
                {tab.label}
              </span>

              {/* Active Tab Accent Bar */}
              {isActive && (
                <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});
