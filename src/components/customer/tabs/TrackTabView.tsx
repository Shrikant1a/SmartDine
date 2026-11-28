"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  MapPin,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/services/pricing";
import { CUSTOMER_TRANSLATIONS, type Language } from "@/lib/i18n/customer";
import type { Order, OrderItem } from "@/types/database";

interface TrackTabViewProps {
  tableNumber: string;
  qrToken?: string;
  lang: Language;
  onExploreMenu: () => void;
}

type OrderWithItems = Order & { items: OrderItem[] };

const STEPS = [
  { key: "new", labelKey: "orderPlaced", timeField: "created_at", icon: Clock },
  { key: "preparing", labelKey: "preparing", timeField: "accepted_at", icon: ChefHat },
  { key: "ready", labelKey: "ready", timeField: "ready_at", icon: CheckCircle2 },
  { key: "served", labelKey: "served", timeField: "served_at", icon: UtensilsCrossed },
] as const;

function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrackTabView({
  tableNumber,
  qrToken,
  lang,
  onExploreMenu,
}: TrackTabViewProps) {
  const t = CUSTOMER_TRANSLATIONS[lang];
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let ignore = false;
    const url = qrToken
      ? `/api/orders?token=${encodeURIComponent(qrToken)}`
      : "/api/orders";

    const fetchOrders = () => {
      fetch(url, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!ignore && data && Array.isArray(data.orders)) {
            setOrders(data.orders);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) {
            setLoading(false);
          }
        });
    };

    fetchOrders();
    // Real-time polling every 6 seconds for live status changes
    const timer = setInterval(fetchOrders, 6000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [qrToken]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const url = qrToken
        ? `/api/orders?token=${encodeURIComponent(qrToken)}`
        : "/api/orders";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      }
    } catch {
      // keep existing orders on network error
    } finally {
      setRefreshing(false);
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-6 w-36 rounded bg-muted" />
        <div className="h-44 rounded-xl bg-muted" />
        <div className="h-44 rounded-xl bg-muted" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <MapPin className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t.noActiveOrders}</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {t.noActiveOrdersDesc}
        </p>
        <Button
          type="button"
          onClick={onExploreMenu}
          className="mt-6 bg-amber-600 text-white hover:bg-amber-700"
        >
          {t.backToMenu}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight">{t.activeOrders}</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t.liveStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-600 text-white hover:bg-amber-600">
            {t.table} {tableNumber}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            aria-label={t.refresh}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const isCancelled = order.status === "cancelled";
          const currentStepIdx = isCancelled
            ? -1
            : STEPS.findIndex((s) => s.key === order.status);

          return (
            <Card key={order.id} className="overflow-hidden border-border/80">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold">
                      {t.orderNumber} #{order.order_number}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} • {formatINR(order.total_amount)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      isCancelled
                        ? "destructive"
                        : order.status === "served"
                        ? "secondary"
                        : "default"
                    }
                    className={
                      order.status === "ready"
                        ? "bg-emerald-600 text-white hover:bg-emerald-600"
                        : order.status === "preparing"
                        ? "bg-blue-600 text-white hover:bg-blue-600"
                        : ""
                    }
                  >
                    {isCancelled ? t.cancelled : t[order.status as keyof typeof t] || order.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* 4-Step Visual Stepper */}
                {isCancelled ? (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{order.cancel_reason || "This order was cancelled."}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 py-1 text-center">
                    {STEPS.map((step, idx) => {
                      const isComplete = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      const stepTime = formatTimestamp(
                        order[step.timeField as keyof Order] as string | null
                      );
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                              isCurrent
                                ? "bg-amber-600 text-white ring-4 ring-amber-600/20"
                                : isComplete
                                ? "bg-emerald-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <span
                            className={`mt-1.5 text-[11px] leading-tight ${
                              isCurrent
                                ? "font-bold text-foreground"
                                : isComplete
                                ? "font-medium text-foreground/80"
                                : "text-muted-foreground"
                            }`}
                          >
                            {t[step.labelKey as keyof typeof t]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {stepTime || "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Ordered Items List */}
                {order.items && order.items.length > 0 && (
                  <div className="rounded-lg border bg-muted/20 p-2.5 text-xs">
                    <p className="mb-1.5 font-semibold text-muted-foreground">
                      {t.itemsOrdered} ({order.items.length}):
                    </p>
                    <ul className="space-y-1">
                      {order.items.map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span>
                            {it.item_name_snapshot}{" "}
                            {it.variant_name_snapshot && (
                              <span className="text-muted-foreground">({it.variant_name_snapshot})</span>
                            )}{" "}
                            × {it.quantity}
                          </span>
                          <span className="font-medium">{formatINR(it.line_total)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
