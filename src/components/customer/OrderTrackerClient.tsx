"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Star,
  Wifi,
  WifiOff,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatINR } from "@/services/pricing";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CallWaiterButton } from "@/components/customer/CallWaiterButton";
import { RazorpayRetryButton } from "@/components/customer/RazorpayCheckoutButton";
import type { Order, OrderItem } from "@/types/database";

const STATUS_STEPS = [
  { key: "new", label: "Order Received", timeField: "created_at" },
  { key: "preparing", label: "Preparing", timeField: "accepted_at" },
  { key: "ready", label: "Ready", timeField: "ready_at" },
  { key: "served", label: "Served", timeField: "served_at" },
] as const;

function formatStepTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTrackerClient({
  initialOrder,
  items,
  tableNumber,
}: {
  initialOrder: Order;
  items: OrderItem[];
  tableNumber: string;
}) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [connectionState, setConnectionState] = useState<"live" | "polling">(
    "polling",
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchLatestOrder = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/orders/${initialOrder.id}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
      }
    } finally {
      setRefreshing(false);
    }
  }, [initialOrder.id]);

  useEffect(() => {
    if (order.status === "served" || order.status === "cancelled") {
      return;
    }

    let channel: ReturnType<
      ReturnType<typeof createSupabaseBrowserClient>["channel"]
    > | null = null;

    try {
      const supabase = createSupabaseBrowserClient();
      channel = supabase
        .channel(`order-track-${initialOrder.id}`)
        .on("broadcast", { event: "status_changed" }, ({ payload }: { payload: Partial<Order> }) => {
          setOrder((prev) => ({
            ...prev,
            status: payload.status ?? prev.status,
            accepted_at: payload.accepted_at ?? prev.accepted_at,
            ready_at: payload.ready_at ?? prev.ready_at,
            served_at: payload.served_at ?? prev.served_at,
            cancelled_at: payload.cancelled_at ?? prev.cancelled_at,
            cancel_reason: payload.cancel_reason ?? prev.cancel_reason,
            payment_status: payload.payment_status ?? prev.payment_status,
          }));
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            setConnectionState("live");
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setConnectionState("polling");
          }
        });
    } catch {
      // Falls back to polling automatically
    }

    const pollTimer = setInterval(() => {
      void fetchLatestOrder();
    }, 8_000);

    const handleReconnect = () => {
      if (document.visibilityState === "visible") {
        void fetchLatestOrder();
      }
    };
    window.addEventListener("online", handleReconnect);
    document.addEventListener("visibilitychange", handleReconnect);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener("online", handleReconnect);
      document.removeEventListener("visibilitychange", handleReconnect);
      if (channel) {
        try {
          const supabase = createSupabaseBrowserClient();
          void supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [initialOrder.id, order.status, fetchLatestOrder]);

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="space-y-5">
      <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold">Order {order.order_number}</h1>
                <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                  Table {tableNumber}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {order.status === "served"
                  ? "Your meal has been served. Enjoy dining with us!"
                  : order.status === "ready"
                    ? "Your food is ready! A waiter is bringing it to your table."
                    : order.status === "preparing"
                      ? "Our kitchen is preparing your order fresh."
                      : order.status === "cancelled"
                        ? "This order was cancelled."
                        : "Order received and queued for the kitchen."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <CallWaiterButton tableNumber={tableNumber} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>Live Order Progress</span>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`gap-1 text-[11px] ${
                  connectionState === "live"
                    ? "border-emerald-500/40 text-emerald-700"
                    : "border-amber-500/40 text-amber-700"
                }`}
              >
                {connectionState === "live" ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Auto-Refresh
                  </>
                )}
              </Badge>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={refreshing}
                onClick={() => void fetchLatestOrder()}
              >
                <RefreshCw
                  className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.status === "cancelled" ? (
            <p className="text-sm text-destructive">
              Order cancelled
              {order.cancel_reason ? `: ${order.cancel_reason}` : "."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {STATUS_STEPS.map((step, idx) => {
                const active = idx <= currentIdx;
                const ts = formatStepTime(order[step.timeField]);
                return (
                  <div key={step.key} className="space-y-1.5">
                    <div
                      className={`h-2.5 rounded-full transition-colors ${
                        active ? "bg-emerald-600" : "bg-muted"
                      }`}
                    />
                    <p
                      className={`text-xs font-semibold ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {ts ? (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {ts}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/60">Pending</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {order.status === "served" ? (
        <Card className="border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">How was your experience?</p>
              <p className="text-xs text-muted-foreground">
                Share a quick 1–5 star rating for your order.
              </p>
            </div>
            <Link
              href={`/review/${order.id}`}
              className={buttonVariants({
                className: "bg-amber-600 text-white hover:bg-amber-700",
              })}
            >
              <Star className="mr-1.5 h-4 w-4" />
              Rate Your Order
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ordered Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4">
              <div>
                <p className="font-medium">
                  {item.quantity}x {item.item_name_snapshot}
                  {item.variant_name_snapshot
                    ? ` (${item.variant_name_snapshot})`
                    : ""}
                </p>
                {Array.isArray(item.addons_snapshot) &&
                item.addons_snapshot.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add-ons: {item.addons_snapshot.map((a) => a.name).join(", ")}
                  </p>
                ) : null}
                {item.special_instructions ? (
                  <p className="text-xs italic text-muted-foreground">
                    Note: {item.special_instructions}
                  </p>
                ) : null}
              </div>
              <span className="font-medium">{formatINR(item.line_total)}</span>
            </div>
          ))}

          <Separator />
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatINR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST</span>
            <span>{formatINR(order.tax_amount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatINR(order.total_amount)}</span>
          </div>

          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Payment Mode:{" "}
              <strong className="capitalize text-foreground">
                {order.payment_mode.replace("_", " ")}
              </strong>
            </span>
            <Badge
              variant={order.payment_status === "paid" ? "default" : "outline"}
              className="capitalize"
            >
              Payment: {order.payment_status}
            </Badge>
          </div>
          {order.payment_mode === "online" &&
          order.payment_status !== "paid" &&
          order.payment_status !== "refunded" &&
          order.status !== "cancelled" ? (
            <div className="pt-2">
              <RazorpayRetryButton
                orderId={order.id}
                onCompleted={() => void fetchLatestOrder()}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Link href="/menu" className={buttonVariants({ variant: "outline" })}>
          Order More Items
        </Link>
      </div>
    </div>
  );
}
