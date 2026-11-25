"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VegIndicator } from "@/components/customer/VegIndicator";
import { calculateLinePricing, formatINR } from "@/services/pricing";
import type { MenuItemWithOptions } from "@/services/customer-menu";
import type { CartAddonSelection, CartEntry } from "@/hooks/useCartStore";

interface FoodDetailDialogProps {
  item: MenuItemWithOptions | null;
  initialEntry?: CartEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entry: Omit<CartEntry, "cartKey">) => void;
}

export function FoodDetailDialog({
  item,
  initialEntry,
  open,
  onOpenChange,
  onConfirm,
}: FoodDetailDialogProps) {
  const defaultVariant = useMemo(() => {
    if (!item || item.variants.length === 0) return null;
    if (initialEntry?.variantId) {
      return item.variants.find((v) => v.id === initialEntry.variantId) ?? null;
    }
    return (
      item.variants.find((v) => v.is_default && v.is_available) ??
      item.variants.find((v) => v.is_available) ??
      null
    );
  }, [item, initialEntry]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariant?.id ?? null,
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(
    initialEntry?.addons.map((a) => a.id) ?? [],
  );
  const [quantity, setQuantity] = useState<number>(initialEntry?.quantity ?? 1);
  const [instructions, setInstructions] = useState<string>(
    initialEntry?.specialInstructions ?? "",
  );

  // Sync local selection whenever modal opens for a different item
  const [trackedKey, setTrackedKey] = useState<string>("");
  const currentKey = `${item?.id ?? ""}:${initialEntry?.cartKey ?? "new"}:${open}`;
  if (currentKey !== trackedKey) {
    setTrackedKey(currentKey);
    if (open && item) {
      const nextVar =
        (initialEntry?.variantId
          ? item.variants.find((v) => v.id === initialEntry.variantId)
          : undefined) ??
        item.variants.find((v) => v.is_default && v.is_available) ??
        item.variants.find((v) => v.is_available) ??
        null;
      setSelectedVariantId(nextVar?.id ?? null);
      setSelectedAddonIds(initialEntry?.addons.map((a) => a.id) ?? []);
      setQuantity(initialEntry?.quantity ?? 1);
      setInstructions(initialEntry?.specialInstructions ?? "");
    }
  }

  if (!item) return null;

  const activeVariant =
    item.variants.find((v) => v.id === selectedVariantId) ?? null;
  const unitPrice = activeVariant ? activeVariant.price : item.base_price;
  const chosenAddons: CartAddonSelection[] = item.addons
    .filter((a) => selectedAddonIds.includes(a.id) && a.is_available)
    .map((a) => ({ id: a.id, name: a.name, price: a.price }));

  const pricing = calculateLinePricing({
    unitPrice,
    addonsPrices: chosenAddons.map((a) => a.price),
    gstPercent: item.gst_percent,
    quantity,
  });

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  }

  function handleSave() {
    if (!item) return;
    onConfirm({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      isVeg: item.is_veg,
      gstPercent: item.gst_percent,
      variantId: activeVariant?.id ?? null,
      variantName: activeVariant?.name ?? null,
      unitPrice,
      addons: chosenAddons,
      quantity,
      specialInstructions: instructions.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="mb-2 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <VegIndicator isVeg={item.is_veg} />
            <DialogTitle className="text-lg">{item.name}</DialogTitle>
            {item.is_recommended ? (
              <Badge variant="secondary" className="ml-auto text-[11px]">
                Chef&apos;s Pick
              </Badge>
            ) : null}
          </div>
          {item.description ? (
            <DialogDescription>{item.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-5 py-1">
          {item.variants.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select Size / Variant
              </Label>
              <div className="grid gap-2">
                {item.variants.map((variant) => {
                  const selected = variant.id === selectedVariantId;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={!variant.is_available}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? "border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 dark:bg-amber-950/30"
                          : "hover:bg-muted/50"
                      } ${!variant.is_available ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="font-medium">
                        {variant.name}
                        {!variant.is_available ? " (Unavailable)" : ""}
                      </span>
                      <span className="font-semibold">{formatINR(variant.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {item.addons.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Optional Add-ons
              </Label>
              <div className="grid gap-2">
                {item.addons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      disabled={!addon.is_available}
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                        checked
                          ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/30"
                          : "hover:bg-muted/50"
                      } ${!addon.is_available ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            checked
                              ? "border-amber-600 bg-amber-600 text-white"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {checked ? "✓" : ""}
                        </span>
                        <span>{addon.name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        +{formatINR(addon.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="item-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Special Cooking Instructions (Optional)
            </Label>
            <Textarea
              id="item-notes"
              placeholder="e.g., Less spicy, no onions, extra crispy..."
              maxLength={200}
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button type="button" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave}>
            {initialEntry ? "Update Item" : "Add to Cart"} • {formatINR(pricing.lineSubtotal)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
