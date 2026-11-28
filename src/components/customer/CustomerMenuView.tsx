"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Flame,
  Languages,
  Search,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VegIndicator } from "@/components/customer/VegIndicator";
import { WifiDialogButton } from "@/components/customer/WifiDialogButton";
import { CallWaiterButton } from "@/components/customer/CallWaiterButton";
import { FoodDetailDialog } from "@/components/customer/FoodDetailDialog";
import { CustomerBottomNav, type CustomerTab } from "@/components/customer/CustomerBottomNav";
import { CartTabView } from "@/components/customer/tabs/CartTabView";
import { TrackTabView } from "@/components/customer/tabs/TrackTabView";
import { BillTabView } from "@/components/customer/tabs/BillTabView";
import { ServiceTabView } from "@/components/customer/tabs/ServiceTabView";
import { useCartStore } from "@/hooks/useCartStore";
import { formatINR } from "@/services/pricing";
import { CUSTOMER_TRANSLATIONS, type Language } from "@/lib/i18n/customer";
import type {
  CustomerMenuCatalog,
  MenuItemWithOptions,
  ResolvedTableInfo,
} from "@/services/customer-menu";
import { toast } from "sonner";

interface CustomerMenuViewProps {
  qrToken: string;
  table: ResolvedTableInfo;
  catalog: CustomerMenuCatalog;
}

export function CustomerMenuView({
  qrToken,
  table,
  catalog,
}: CustomerMenuViewProps) {
  const [activeTab, setActiveTab] = useState<CustomerTab>("menu");
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartdine-lang");
      if (saved === "en" || saved === "mr") {
        return saved;
      }
    }
    return "en";
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItemWithOptions | null>(null);
  const [sessionReady, setSessionReady] = useState(true);

  const t = CUSTOMER_TRANSLATIONS[lang];

  // Atomic selectors from Zustand store
  const setTableContext = useCartStore((s) => s.setTableContext);
  const addItem = useCartStore((s) => s.addItem);

  function toggleLanguage() {
    setLang((prev) => {
      const next: Language = prev === "en" ? "mr" : "en";
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdine-lang", next);
      }
      return next;
    });
  }

  // Set table context and ensure session cookie in the background
  useEffect(() => {
    const path = qrToken ? `/menu/${qrToken}` : "/menu";
    setTableContext(table.id, table.table_number, path);
    if (!qrToken) return;

    if (typeof document !== "undefined" && document.cookie.includes("smartdine_table_session")) {
      return;
    }

    let cancelled = false;
    fetch("/api/table/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: qrToken }),
    })
      .then((res) => {
        if (!cancelled && res.ok) setSessionReady(true);
      })
      .catch(() => {
        // Safe retry on checkout
      });

    return () => {
      cancelled = true;
    };
  }, [qrToken, table.id, table.table_number, setTableContext]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.items.filter((item) => {
      if (selectedCategory !== "all" && item.category_id !== selectedCategory) {
        return false;
      }
      if (vegOnly && !item.is_veg) {
        return false;
      }
      if (q) {
        const hay = `${item.name} ${item.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalog.items, selectedCategory, vegOnly, searchQuery]);

  function handleQuickOrModal(item: MenuItemWithOptions) {
    if (!item.is_available || item.stock_qty === 0) return;
    setActiveItem(item);
  }

  return (
    <div className="space-y-5 pb-28 sm:pb-32">
      {/* Restaurant Banner & Locked Table Bar (Always visible at top) */}
      <Card className="border-amber-500/25 bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/20">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {catalog.restaurant.name}
              </h1>
              <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                {t.table} {table.table_number}
              </Badge>
              {!catalog.restaurant.is_open ? (
                <Badge variant="destructive">{t.kitchenClosed}</Badge>
              ) : null}
            </div>
            {catalog.restaurant.description ? (
              <p className="text-xs text-muted-foreground">
                {catalog.restaurant.description}
              </p>
            ) : null}
            {table.label ? (
              <p className="text-[11px] text-muted-foreground">
                Assigned: {table.label}
                {sessionReady ? " • Verified QR session" : ""}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Marathi / English Language Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-1.5 border-amber-500/40 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200 text-xs font-semibold"
            >
              <Languages className="h-3.5 w-3.5 text-amber-600" />
              <span>{lang === "en" ? "मराठी" : "English"}</span>
            </Button>

            <CallWaiterButton tableNumber={table.table_number} />
            <WifiDialogButton />
          </div>
        </CardContent>
      </Card>

      {/* TAB 1: MENU VIEW */}
      {activeTab === "menu" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Search & Veg Filter */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t.searchPlaceholder}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant={vegOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setVegOnly((v) => !v)}
              className={
                vegOnly
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "gap-1.5"
              }
            >
              <VegIndicator isVeg={true} />
              <span>{t.vegOnly}</span>
            </Button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className="shrink-0 rounded-full"
            >
              {t.allDishes} ({catalog.items.length})
            </Button>
            {catalog.categories.map((cat) => (
              <Button
                key={cat.id}
                type="button"
                size="sm"
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className="shrink-0 rounded-full"
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Menu Grid */}
          {filteredItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No dishes match your current search or filter.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {filteredItems.map((item, idx) => {
                const soldOut = !item.is_available || item.stock_qty === 0;
                const startingPrice =
                  item.variants.length > 0
                    ? Math.min(...item.variants.map((v) => v.price))
                    : item.base_price;

                return (
                  <Card
                    key={item.id}
                    className={`overflow-hidden transition ${
                      soldOut ? "opacity-65" : "hover:border-amber-500/40"
                    }`}
                  >
                    <CardContent className="flex gap-3.5 p-3.5">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            sizes="96px"
                            loading={idx < 4 ? "eager" : "lazy"}
                            priority={idx < 4}
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                            <UtensilsCrossed className="h-7 w-7" />
                          </div>
                        )}
                        {soldOut ? (
                          <span className="absolute inset-x-1 bottom-1 rounded bg-slate-900/85 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                            {t.soldOut}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <VegIndicator isVeg={item.is_veg} />
                              <h2 className="truncate text-sm font-semibold">
                                {item.name}
                              </h2>
                            </div>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.is_recommended ? (
                              <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                                <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                Recommended
                              </Badge>
                            ) : null}
                            {item.is_popular ? (
                              <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                                <Flame className="h-2.5 w-2.5 text-rose-600" />
                                Popular
                              </Badge>
                            ) : null}
                          </div>

                          {item.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold">
                              {item.variants.length > 0 ? `${t.from} ` : ""}
                              {formatINR(startingPrice)}
                            </span>
                            {item.variants.length > 0 || item.addons.length > 0 ? (
                              <p className="text-[10px] text-muted-foreground">
                                {t.customizable}
                              </p>
                            ) : null}
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={soldOut || !catalog.restaurant.is_open}
                            onClick={() => handleQuickOrModal(item)}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                          >
                            {soldOut ? t.soldOut : t.add}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CART VIEW */}
      {activeTab === "cart" && (
        <CartTabView
          tableNumber={table.table_number}
          lang={lang}
          onBackToMenu={() => setActiveTab("menu")}
        />
      )}

      {/* TAB 3: TRACK VIEW */}
      {activeTab === "track" && (
        <TrackTabView
          tableNumber={table.table_number}
          qrToken={qrToken}
          lang={lang}
          onExploreMenu={() => setActiveTab("menu")}
        />
      )}

      {/* TAB 4: BILL VIEW */}
      {activeTab === "bill" && (
        <BillTabView
          tableNumber={table.table_number}
          qrToken={qrToken}
          lang={lang}
          onExploreMenu={() => setActiveTab("menu")}
        />
      )}

      {/* TAB 5: SERVICE (BELL) VIEW */}
      {activeTab === "service" && (
        <ServiceTabView
          tableNumber={table.table_number}
          qrToken={qrToken}
          lang={lang}
        />
      )}

      {/* Food Customization Modal */}
      <FoodDetailDialog
        item={activeItem}
        open={Boolean(activeItem)}
        onOpenChange={(open) => {
          if (!open) setActiveItem(null);
        }}
        onConfirm={(entry) => {
          addItem(entry);
          toast.success(`${t.added}: ${entry.name}`);
        }}
      />

      {/* FIXED 5-TAB NATIVE BOTTOM NAVIGATION BAR */}
      <CustomerBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
      />
    </div>
  );
}
