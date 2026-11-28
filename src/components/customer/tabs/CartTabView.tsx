"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VegIndicator } from "@/components/customer/VegIndicator";
import { useCartStore } from "@/hooks/useCartStore";
import { calculateOrderPricing, formatINR } from "@/services/pricing";
import { CUSTOMER_TRANSLATIONS, type Language } from "@/lib/i18n/customer";

interface CartTabViewProps {
  tableNumber: string;
  lang: Language;
  onBackToMenu: () => void;
}

export function CartTabView({ tableNumber, lang, onBackToMenu }: CartTabViewProps) {
  const t = CUSTOMER_TRANSLATIONS[lang];
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t.cartEmpty}</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {t.cartEmptyDesc}
        </p>
        <Button
          type="button"
          onClick={onBackToMenu}
          className="mt-6 gap-2 bg-amber-600 text-white hover:bg-amber-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backToMenu}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onBackToMenu}
            aria-label={t.backToMenu}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight">{t.yourCart}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-600 text-white hover:bg-amber-600">
            {t.table} {tableNumber}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={clearCart}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Clear
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {items.map((entry) => {
            const addonsSum = entry.addons.reduce((a, b) => a + b.price, 0);
            const lineTotal = (entry.unitPrice + addonsSum) * entry.quantity;

            return (
              <div key={entry.cartKey} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 shrink-0">
                      <VegIndicator isVeg={entry.isVeg} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm leading-snug">{entry.name}</h3>
                      {entry.variantName && (
                        <p className="text-xs text-muted-foreground">
                          {entry.variantName}
                        </p>
                      )}
                      {entry.addons.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          + {entry.addons.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      {entry.specialInstructions && (
                        <p className="mt-0.5 text-[11px] italic text-amber-600 dark:text-amber-400">
                          &quot;{entry.specialInstructions}&quot;
                        </p>
                      )}
                      <p className="mt-1 text-xs font-semibold text-foreground">
                        {formatINR(entry.unitPrice + addonsSum)} × {entry.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-sm">{formatINR(lineTotal)}</span>
                    <div className="flex items-center rounded-lg border bg-muted/30">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Decrease quantity"
                        onClick={() => {
                          if (entry.quantity <= 1) {
                            removeItem(entry.cartKey);
                          } else {
                            updateQuantity(entry.cartKey, -1);
                          }
                        }}
                      >
                        {entry.quantity <= 1 ? (
                          <Trash2 className="h-3 w-3 text-destructive" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                      </Button>
                      <span className="w-7 text-center text-xs font-bold">
                        {entry.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Increase quantity"
                        onClick={() => updateQuantity(entry.cartKey, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Bill Breakdown */}
      {pricing && (
        <Card className="bg-card">
          <CardContent className="space-y-2 p-4 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{t.subtotal}</span>
              <span className="font-medium text-foreground">{formatINR(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t.taxGst}</span>
              <span className="font-medium text-foreground">{formatINR(pricing.taxAmount)}</span>
            </div>
            {pricing.serviceCharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t.serviceCharge}</span>
                <span className="font-medium text-foreground">{formatINR(pricing.serviceCharge)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-sm font-bold">
              <span>{t.grandTotal}</span>
              <span className="text-amber-600 dark:text-amber-400">{formatINR(pricing.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Place Order CTA */}
      <div className="pt-2">
        <Link
          href="/checkout"
          className={buttonVariants({
            size: "lg",
            className: "w-full gap-2 bg-amber-600 text-white hover:bg-amber-700 shadow-md font-semibold text-base",
          })}
        >
          <ShoppingBag className="h-5 w-5" />
          {t.placeOrder} • {pricing ? formatINR(pricing.totalAmount) : ""}
        </Link>
      </div>
    </div>
  );
}
