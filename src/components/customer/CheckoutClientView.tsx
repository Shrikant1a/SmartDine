"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Loader2,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCartStore } from "@/hooks/useCartStore";
import { launchRazorpayForOrder } from "@/components/customer/RazorpayCheckoutButton";
import { calculateOrderPricing, formatINR } from "@/services/pricing";
import type { PaymentMode } from "@/constants/roles";
import { toast } from "sonner";

interface CheckoutClientViewProps {
  tableNumber: string;
  razorpayEnabled: boolean;
}

export function CheckoutClientView({
  tableNumber,
  razorpayEnabled,
}: CheckoutClientViewProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const menuPath = useCartStore((s) => s.menuPath);
  const clearCart = useCartStore((s) => s.clearCart);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash_table");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable idempotency key per checkout session to block duplicate orders on repeated clicks
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const pricing = useMemo(() => {
    if (items.length === 0) return null;
    return calculateOrderPricing(
      items.map((i) => ({
        unitPrice: i.unitPrice,
        addonsPrices: i.addons.map((a) => a.price),
        gstPercent: i.gstPercent,
        quantity: i.quantity,
      })),
    );
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="Nothing to check out"
        description="Your cart is empty. Add items from the menu before placing an order."
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
    );
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMode,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          whatsappConsent: Boolean(customerPhone.trim() && whatsappConsent),
          specialInstructions: specialInstructions.trim() || undefined,
          idempotencyKey,
          items: items.map((entry) => ({
            menuItemId: entry.menuItemId,
            variantId: entry.variantId,
            addonIds: entry.addons.map((a) => a.id),
            quantity: entry.quantity,
            specialInstructions: entry.specialInstructions || undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not place order. Please review your cart.");
        return;
      }

      clearCart();
      toast.success(`Order ${data.order.order_number} placed!`);

      if (paymentMode === "online") {
        await launchRazorpayForOrder({
          orderId: data.order.id,
          onVerified: () => {
            router.push(`/order/${data.order.id}`);
          },
          onDismissOrFail: (msg) => {
            if (msg) toast.info(msg);
            router.push(`/order/${data.order.id}`);
          },
        });
        return;
      }

      router.push(`/order/${data.order.id}`);
    } catch {
      setError("Network error while placing your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handlePlaceOrder} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Back to cart"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
        </div>
        <Badge className="bg-amber-600 text-white hover:bg-amber-600">
          Locked to Table {tableNumber}
        </Badge>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Guest Details (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customerName">Your Name</Label>
              <Input
                id="customerName"
                placeholder="e.g., Priya"
                maxLength={80}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">Mobile Number (for order updates)</Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="10-digit mobile number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orderNotes">Overall Order Notes</Label>
            <Textarea
              id="orderNotes"
              placeholder="Cutlery requests, allergies, or serving sequence..."
              maxLength={300}
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>
          {customerPhone.trim().length >= 10 ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
              />
              Send me a WhatsApp notification when my order is ready
            </label>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Select Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2.5">
          {[
            {
              id: "cash_table" as const,
              title: "Cash at Table",
              desc: "Pay in cash directly to your waiter after dining.",
              icon: Banknote,
              disabled: false,
            },
            {
              id: "counter" as const,
              title: "Pay at Counter",
              desc: "Settle via cash or UPI/card at the billing counter.",
              icon: Store,
              disabled: false,
            },
            {
              id: "online" as const,
              title: "Pay Online (Razorpay UPI / Cards)",
              desc: razorpayEnabled
                ? "Instant secure online checkout."
                : "Available once Razorpay credentials are configured (Phase 5).",
              icon: CreditCard,
              disabled: !razorpayEnabled,
            },
          ].map((option) => {
            const Icon = option.icon;
            const selected = paymentMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={option.disabled}
                onClick={() => setPaymentMode(option.id)}
                className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition ${
                  selected
                    ? "border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 dark:bg-amber-950/30"
                    : "hover:bg-muted/40"
                } ${option.disabled ? "cursor-not-allowed opacity-55" : ""}`}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold">{option.title}</p>
                  <p className="text-xs text-muted-foreground">{option.desc}</p>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {pricing ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Order Review ({items.reduce((s, i) => s + i.quantity, 0)} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {items.map((item) => {
              const unit = item.unitPrice + item.addons.reduce((a, b) => a + b.price, 0);
              return (
                <div key={item.cartKey} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                  </span>
                  <span>{formatINR(unit * item.quantity)}</span>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatINR(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST</span>
              <span>{formatINR(pricing.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold">
              <span>Total Payable</span>
              <span>{formatINR(pricing.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>Prices, stock, and taxes are verified on the server before kitchen dispatch.</span>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="w-full bg-amber-600 text-white hover:bg-amber-700"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting to Kitchen...
          </>
        ) : (
          `Place Order • ${pricing ? formatINR(pricing.totalAmount) : ""}`
        )}
      </Button>
    </form>
  );
}
