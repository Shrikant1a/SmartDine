"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useKitchenAlertSound } from "@/hooks/useKitchenAlertSound";
import { KitchenOrderCard } from "@/components/kitchen/KitchenOrderCard";
import {
  matchesTimeFilter,
  type KitchenOrderView,
  type KitchenWaiterCallView,
  type TimeWindowFilter,
} from "@/services/kitchen";
import type { OrderStatus, StaffRole } from "@/constants/roles";
import { toast } from "sonner";

interface KitchenBoardProps {
  restaurantId: string;
  staffRole: StaffRole;
  initialOrders: KitchenOrderView[];
  initialWaiterCalls: KitchenWaiterCallView[];
}

type RealtimeConnectionState = "connecting" | "live" | "polling";
type ColumnFilter = "all" | "new" | "preparing" | "ready";

export function KitchenBoard({
  restaurantId,
  staffRole,
  initialOrders,
  initialWaiterCalls,
}: KitchenBoardProps) {
  const [orders, setOrders] = useState<KitchenOrderView[]>(initialOrders);
  const [waiterCalls, setWaiterCalls] =
    useState<KitchenWaiterCallView[]>(initialWaiterCalls);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("polling");
  const [timeFilter, setTimeFilter] = useState<TimeWindowFilter>("all");
  const [columnFilter, setColumnFilter] = useState<ColumnFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const knownOrderIdsRef = useRef<Set<string>>(
    new Set(initialOrders.map((o) => o.id)),
  );
  const { soundEnabled, toggleSound, playNewOrderChime } = useKitchenAlertSound();

  const refreshSnapshot = useCallback(
    async (announceNew = true) => {
      try {
        setRefreshing(true);
        const res = await fetch("/api/kitchen/orders", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          orders: KitchenOrderView[];
          waiterCalls: KitchenWaiterCallView[];
        };

        const incomingNewIds: string[] = [];
        for (const order of data.orders) {
          if (!knownOrderIdsRef.current.has(order.id)) {
            knownOrderIdsRef.current.add(order.id);
            if (order.status === "new") {
              incomingNewIds.push(order.id);
            }
          }
        }

        if (announceNew && incomingNewIds.length > 0) {
          playNewOrderChime();
          setHighlightedIds((prev) => {
            const next = new Set(prev);
            incomingNewIds.forEach((id) => next.add(id));
            return next;
          });
          setTimeout(() => {
            setHighlightedIds((prev) => {
              const next = new Set(prev);
              incomingNewIds.forEach((id) => next.delete(id));
              return next;
            });
          }, 12_000);
        }

        setOrders(data.orders);
        setWaiterCalls(data.waiterCalls);
      } finally {
        setRefreshing(false);
      }
    },
    [playNewOrderChime],
  );

  // Supabase Realtime subscription + 10-second polling fallback
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null =
      null;

    try {
      const supabase = createSupabaseBrowserClient();
      channel = supabase
        .channel(`kds-orders-${restaurantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => {
            void refreshSnapshot(true);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "waiter_calls",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => {
            void refreshSnapshot(false);
          },
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
      // Initial connectionState is already "polling"
    }

    const pollInterval = setInterval(() => {
      void refreshSnapshot(true);
    }, 10_000);

    return () => {
      clearInterval(pollInterval);
      if (channel) {
        try {
          const supabase = createSupabaseBrowserClient();
          void supabase.removeChannel(channel);
        } catch {
          // ignore cleanup failure
        }
      }
    };
  }, [restaurantId, refreshSnapshot]);

  async function handleTransition(orderId: string, nextStatus: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not update order status");
        await refreshSnapshot(false);
        return;
      }

      toast.success(`Order updated to ${nextStatus.toUpperCase()}`);
      await refreshSnapshot(false);
    } catch {
      toast.error("Network error while updating order");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesTimeFilter(order.created_at, timeFilter)) return false;
      if (q) {
        const hay = `${order.order_number} ${order.table_number}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, timeFilter, searchQuery]);

  const columns = useMemo(() => {
    return {
      new: filteredOrders.filter((o) => o.status === "new"),
      preparing: filteredOrders.filter((o) => o.status === "preparing"),
      ready: filteredOrders.filter((o) => o.status === "ready"),
    };
  }, [filteredOrders]);

  const allColumns: Array<{
    key: "new" | "preparing" | "ready";
    title: string;
    badgeClass: string;
    items: KitchenOrderView[];
  }> = [
    {
      key: "new",
      title: "New Orders",
      badgeClass: "bg-amber-500 text-slate-950",
      items: columns.new,
    },
    {
      key: "preparing",
      title: "Preparing",
      badgeClass: "bg-sky-500 text-slate-950",
      items: columns.preparing,
    },
    {
      key: "ready",
      title: "Ready",
      badgeClass: "bg-emerald-500 text-slate-950",
      items: columns.ready,
    },
  ];
  const visibleColumns = allColumns.filter(
    (c) => columnFilter === "all" || c.key === columnFilter,
  );

  return (
    <div className="space-y-5">
      {/* Control Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant={soundEnabled ? "default" : "outline"}
            onClick={() => void toggleSound()}
            className={
              soundEnabled
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            }
          >
            {soundEnabled ? (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Sound Alerts On
              </>
            ) : (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Enable Sound Alerts
              </>
            )}
          </Button>

          <Badge
            variant="outline"
            className={`gap-1.5 px-3 py-1 text-xs ${
              connectionState === "live"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-300"
            }`}
          >
            {connectionState === "live" ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                Realtime Live
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                Polling Fallback (10s)
              </>
            )}
          </Badge>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => void refreshSnapshot(false)}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Order # or Table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-slate-700 bg-slate-950 pl-8 text-xs text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
            {(
              [
                { id: "all", label: "All Time" },
                { id: "15m", label: "15m" },
                { id: "1h", label: "1h" },
                { id: "today", label: "Today" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeFilter(opt.id)}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  timeFilter === opt.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
            {(
              [
                { id: "all", label: "All" },
                { id: "new", label: `New (${columns.new.length})` },
                { id: "preparing", label: `Prep (${columns.preparing.length})` },
                { id: "ready", label: `Ready (${columns.ready.length})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setColumnFilter(opt.id)}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  columnFilter === opt.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Waiter Call Alert Strip */}
      {waiterCalls.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          <BellRing className="h-4 w-4 shrink-0 animate-bounce text-rose-400" />
          <span className="font-semibold">Active Waiter Calls:</span>
          {waiterCalls.map((call) => (
            <Badge
              key={call.id}
              className="bg-rose-600 text-white hover:bg-rose-600"
            >
              Table {call.table_number}
              {call.status === "acknowledged" ? " (Ack)" : ""}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* 3-Column KDS Board */}
      <div
        className={`grid gap-5 ${
          visibleColumns.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-3"
        }`}
      >
        {visibleColumns.map((col) => (
          <section
            key={col.key}
            className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-3.5"
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h2 className="text-base font-bold tracking-tight text-white">
                {col.title}
              </h2>
              <Badge className={`${col.badgeClass} font-bold`}>
                {col.items.length}
              </Badge>
            </div>

            {col.items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-800 py-14 text-center text-sm text-slate-500">
                No orders in {col.title.toLowerCase()}
              </div>
            ) : (
              <div className="space-y-3.5">
                {col.items.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    staffRole={staffRole}
                    isHighlighted={highlightedIds.has(order.id)}
                    updatingId={updatingId}
                    onTransition={handleTransition}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
