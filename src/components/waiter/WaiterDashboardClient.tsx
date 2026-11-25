"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BellRing,
  Check,
  RefreshCw,
  Utensils,
  Wifi,
  WifiOff,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatINR } from "@/services/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RestaurantTable } from "@/types/database";
import type {
  WaiterCallWithTable,
  WaiterOrderView,
} from "@/services/waiter-server";
import { toast } from "sonner";

type TableRow = Omit<RestaurantTable, "qr_token_hash">;

interface WaiterDashboardClientProps {
  restaurantId: string;
  initialWaiterCalls: WaiterCallWithTable[];
  initialOrders: WaiterOrderView[];
  initialTables: TableRow[];
}

export function WaiterDashboardClient({
  restaurantId,
  initialWaiterCalls,
  initialOrders,
  initialTables,
}: WaiterDashboardClientProps) {
  const [waiterCalls, setWaiterCalls] =
    useState<WaiterCallWithTable[]>(initialWaiterCalls);
  const [orders, setOrders] = useState<WaiterOrderView[]>(initialOrders);
  const [tables, setTables] = useState<TableRow[]>(initialTables);
  const [connectionState, setConnectionState] = useState<"live" | "polling">(
    "polling",
  );
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/waiter/dashboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setWaiterCalls(data.waiterCalls ?? []);
      setOrders(data.serviceOrders ?? []);
      setTables(data.tables ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<
      ReturnType<typeof createSupabaseBrowserClient>["channel"]
    > | null = null;

    try {
      const supabase = createSupabaseBrowserClient();
      channel = supabase
        .channel(`waiter-live-${restaurantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "waiter_calls",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => void refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => void refresh(),
        )
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
      // automatic polling fallback
    }

    const poll = setInterval(() => void refresh(), 10_000);
    return () => {
      clearInterval(poll);
      if (channel) {
        try {
          const supabase = createSupabaseBrowserClient();
          void supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [restaurantId, refresh]);

  async function updateCallStatus(
    callId: string,
    status: "acknowledged" | "resolved",
  ) {
    const res = await fetch(`/api/waiter-calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Could not update waiter call");
      return;
    }
    toast.success(`Call ${status}`);
    await refresh();
  }

  async function markOrderServed(orderId: string) {
    const res = await fetch(`/api/kitchen/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "served" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not mark order served");
      return;
    }
    toast.success("Order marked as Served");
    await refresh();
  }

  async function markCashCollected(orderId: string) {
    const res = await fetch(`/api/admin/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "paid" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not record cash payment");
      return;
    }
    toast.success("Cash payment recorded");
    await refresh();
  }

  const readyToServe = useMemo(
    () => orders.filter((o) => o.status === "ready"),
    [orders],
  );
  const pendingCash = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "served" &&
          o.payment_mode !== "online" &&
          o.payment_status === "pending",
      ),
    [orders],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Service Operations</h2>
          <p className="text-xs text-muted-foreground">
            Manage table assistance calls, serve ready dishes, and collect table payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            {connectionState === "live" ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                Live Sync
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                Polling (10s)
              </>
            )}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Waiter Calls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-rose-600" />
            Active Waiter Calls ({waiterCalls.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {waiterCalls.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No active waiter calls right now.
            </p>
          ) : (
            waiterCalls.map((call) => (
              <div
                key={call.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                      Table {call.table_number}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {call.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(call.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {call.note ? (
                    <p className="mt-1 text-sm font-medium">{call.note}</p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  {call.status === "open" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void updateCallStatus(call.id, "acknowledged")}
                    >
                      Acknowledge
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void updateCallStatus(call.id, "resolved")}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Resolve
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Ready to Serve */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4 text-emerald-600" />
            Ready to Serve ({readyToServe.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {readyToServe.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No completed dishes waiting for pickup.
            </p>
          ) : (
            readyToServe.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{order.order_number}</span>
                    <Badge className="bg-amber-600 text-white">
                      Table {order.table_number}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.items
                      .map((i) => `${i.quantity}x ${i.item_name_snapshot}`)
                      .join(", ")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => void markOrderServed(order.id)}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Mark as Served
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pending Cash / Counter Collections */}
      {pendingCash.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4 text-amber-600" />
              Pending Cash / Counter Payments ({pendingCash.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {pendingCash.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{order.order_number}</span>
                    <Badge variant="outline">Table {order.table_number}</Badge>
                    <Badge variant="secondary" className="capitalize">
                      {order.payment_mode.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Amount due: {formatINR(order.total_amount)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void markCashCollected(order.id)}
                >
                  <Banknote className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Mark Cash Collected
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Tables Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Dining Tables ({tables.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tables.map((t) => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">Table {t.table_number}</span>
                <Badge
                  variant={t.status === "occupied" ? "default" : "outline"}
                  className="capitalize text-[11px]"
                >
                  {t.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.label || `${t.capacity} seats`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
