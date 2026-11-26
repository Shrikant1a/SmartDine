"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Flame,
  Search,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VegIndicator } from "@/components/customer/VegIndicator";
import { WifiDialogButton } from "@/components/customer/WifiDialogButton";
import { CallWaiterButton } from "@/components/customer/CallWaiterButton";
import { FoodDetailDialog } from "@/components/customer/FoodDetailDialog";
import { useCartStore } from "@/hooks/useCartStore";
import { formatINR } from "@/services/pricing";
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

/**
 * Isolated bottom bar: Only re-renders when cart contents change,
 * preventing the 50+ menu item cards from unnecessarily re-rendering on every cart add/remove.
 */
const FloatingCartBar = memo(function FloatingCartBar({
  tableNumber,
}: {
  tableNumber: string;
}) {
  const itemsInCart = useCartStore((s) => s.items);

  const cartSummary = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const entry of itemsInCart) {
      count += entry.quantity;
      const addonsSum = entry.addons.reduce((a, b) => a + b.price, 0);
      subtotal += (entry.unitPrice + addonsSum) * entry.quantity;
    }
    return { count, subtotal };
  }, [itemsInCart]);

  if (cartSummary.count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/15 text-amber-700">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {cartSummary.count} {cartSummary.count === 1 ? "item" : "items"} •{" "}
              {formatINR(cartSummary.subtotal)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Table {tableNumber} • Plus applicable GST
            </p>
          </div>
        </div>
        <Link
          href="/cart"
          className={buttonVariants({
            className: "bg-amber-600 text-white hover:bg-amber-700",
          })}
        >
          View Cart →
        </Link>
      </div>
    </div>
  );
});

export function CustomerMenuView({
  qrToken,
  table,
  catalog,
}: CustomerMenuViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItemWithOptions | null>(null);
  const [sessionReady, setSessionReady] = useState(true);

  // Atomic selectors: only select actions, avoiding broad store re-renders
  const setTableContext = useCartStore((s) => s.setTableContext);
  const addItem = useCartStore((s) => s.addItem);

  // Set table context and ensure session cookie in the background without blocking render
  useEffect(() => {
    const path = qrToken ? `/menu/${qrToken}` : "/menu";
    setTableContext(table.id, table.table_number, path);
    if (!qrToken) return;

    // Check if session cookie is already present in browser
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
        // Retry occurs cleanly on checkout if transient
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
    <div className="space-y-5 pb-24">
      {/* Restaurant Banner & Locked Table Bar */}
      <Card className="border-amber-500/25 bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/20">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {catalog.restaurant.name}
              </h1>
              <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                Table {table.table_number}
              </Badge>
              {!catalog.restaurant.is_open ? (
                <Badge variant="destructive">Kitchen Closed</Badge>
              ) : null}
            </div>
            {catalog.restaurant.description ? (
              <p className="text-xs text-muted-foreground">
                {catalog.restaurant.description}
              </p>
            ) : null}
            {table.label ? (
              <p className="text-[11px] text-muted-foreground">
                Assigned seating: {table.label}
                {sessionReady ? " • Verified QR session" : ""}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <CallWaiterButton tableNumber={table.table_number} />
            <WifiDialogButton />
          </div>
        </CardContent>
      </Card>

      {/* Search & Veg Filter */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search dishes, pizza, tikka..."
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
          <span>Veg Only</span>
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
          All Dishes ({catalog.items.length})
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
                        Sold Out
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
                          {item.variants.length > 0 ? "From " : ""}
                          {formatINR(startingPrice)}
                        </span>
                        {item.variants.length > 0 || item.addons.length > 0 ? (
                          <p className="text-[10px] text-muted-foreground">
                            Customizable
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
                        {soldOut ? "Sold Out" : "+ Add"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Isolated Sticky Bottom Cart Bar */}
      <FloatingCartBar tableNumber={table.table_number} />

      <FoodDetailDialog
        item={activeItem}
        open={Boolean(activeItem)}
        onOpenChange={(open) => {
          if (!open) setActiveItem(null);
        }}
        onConfirm={(entry) => {
          addItem(entry);
          toast.success(`Added ${entry.name} to cart`);
        }}
      />
    </div>
  );
}
