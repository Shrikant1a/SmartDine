"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { VegIndicator } from "@/components/customer/VegIndicator";
import { FoodDetailDialog } from "@/components/customer/FoodDetailDialog";
import { useCartStore, type CartEntry } from "@/hooks/useCartStore";
import { calculateOrderPricing, formatINR } from "@/services/pricing";
import type { MenuItemWithOptions } from "@/services/customer-menu";
import { toast } from "sonner";

interface CartClientViewProps {
  tableNumber: string;
  menuItems: MenuItemWithOptions[];
}

export function CartClientView({ tableNumber, menuItems }: CartClientViewProps) {
  const items = useCartStore((s) => s.items);
  const menuPath = useCartStore((s) => s.menuPath);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateItem = useCartStore((s) => s.updateItem);

  const [editingEntry, setEditingEntry] = useState<CartEntry | null>(null);

  const editingMenuItem = useMemo(() => {
    if (!editingEntry) return null;
    return menuItems.find((m) => m.id === editingEntry.menuItemId) ?? null;
  }, [editingEntry, menuItems]);

  const pricing = useMemo(() => {
    if (items.length === 0) return null;
    return calculateOrderPricing(
      items.map((item) => ({
        unitPrice: item.unitPrice,
        addonsPrices: item.addons.map((a) => a.price),
        gstPercent: item.gstPercent,
        quantity: item.quantity,
      })),
    );
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the menu and add dishes to start your order."
          action={
            <Link
              href={menuPath || "/menu"}
              className={buttonVariants({
                className: "bg-amber-600 text-white hover:bg-amber-700",
              })}
            >
              Back to Menu
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={menuPath || "/menu"}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Back to menu"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Your Cart</h1>
        </div>
        <Badge className="bg-amber-600 text-white hover:bg-amber-600">
          Table {tableNumber}
        </Badge>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {items.map((entry) => {
            const addonsSum = entry.addons.reduce((a, b) => a + b.price, 0);
            const lineTotal = (entry.unitPrice + addonsSum) * entry.quantity;

            return (
              <div key={entry.cartKey} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <VegIndicator isVeg={entry.isVeg} />
                    <span className="font-semibold">{entry.name}</span>
                    {entry.variantName ? (
                      <Badge variant="outline" className="text-[11px]">
                        {entry.variantName}
                      </Badge>
                    ) : null}
                  </div>

                  {entry.addons.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Add-ons: {entry.addons.map((a) => `${a.name} (+${formatINR(a.price)})`).join(", ")}
                    </p>
                  ) : null}

                  {entry.specialInstructions ? (
                    <p className="text-xs italic text-muted-foreground">
                      Note: &ldquo;{entry.specialInstructions}&rdquo;
                    </p>
                  ) : null}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingEntry(entry)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
                    >
                      <Edit3 className="h-3 w-3" />
                      Customize
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeItem(entry.cartKey);
                        toast.info(`Removed ${entry.name}`);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex items-center gap-1.5 rounded-lg border px-1.5 py-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateQuantity(entry.cartKey, -1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {entry.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateQuantity(entry.cartKey, 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <span className="min-w-16 text-right text-sm font-bold">
                    {formatINR(lineTotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {pricing ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Item Subtotal</span>
              <span>{formatINR(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Estimated GST</span>
              <span>{formatINR(pricing.taxAmount)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Payable Total</span>
              <span>{formatINR(pricing.totalAmount)}</span>
            </div>
            <p className="pt-1 text-[11px] text-muted-foreground">
              Final prices and taxes are verified securely on the server when placing your order.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Link
          href={menuPath || "/menu"}
          className={buttonVariants({ variant: "outline" })}
        >
          Add More Items
        </Link>
        <Link
          href="/checkout"
          className={buttonVariants({
            className: "bg-amber-600 text-white hover:bg-amber-700",
          })}
        >
          Proceed to Checkout →
        </Link>
      </div>

      <FoodDetailDialog
        item={editingMenuItem}
        initialEntry={editingEntry}
        open={Boolean(editingEntry && editingMenuItem)}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
        onConfirm={(updated) => {
          if (!editingEntry) return;
          updateItem(editingEntry.cartKey, updated);
          toast.success(`Updated ${updated.name}`);
          setEditingEntry(null);
        }}
      />
    </div>
  );
}
