"use client";

import { useEffect, useState } from "react";
import { Check, ChefHat, Clock, Loader2, MessageSquareWarning, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { getElapsedInfo, type KitchenOrderView } from "@/services/kitchen";
import type { OrderStatus, StaffRole } from "@/constants/roles";

interface KitchenOrderCardProps {
  order: KitchenOrderView;
  staffRole: StaffRole;
  isHighlighted: boolean;
  updatingId: string | null;
  onTransition: (orderId: string, nextStatus: OrderStatus) => void;
}

const COLUMN_ACCENT: Record<"new" | "preparing" | "ready", string> = {
  new: "border-l-4 border-l-amber-500 border-amber-500/40 bg-slate-900",
  preparing: "border-l-4 border-l-sky-500 border-sky-500/40 bg-slate-900",
  ready: "border-l-4 border-l-emerald-500 border-emerald-500/40 bg-slate-900",
};

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KitchenOrderCard({
  order,
  staffRole,
  isHighlighted,
  updatingId,
  onTransition,
}: KitchenOrderCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const elapsed = getElapsedInfo(order.created_at, nowMs);
  const statusKey =
    order.status === "new" || order.status === "preparing" || order.status === "ready"
      ? order.status
      : "new";

  const canPrepare =
    staffRole === "kitchen" || staffRole === "manager" || staffRole === "owner";
  const canServe =
    staffRole === "waiter" || staffRole === "manager" || staffRole === "owner";
  const isUpdating = updatingId === order.id;

  return (
    <Card
      className={`text-slate-100 transition-all duration-300 ${COLUMN_ACCENT[statusKey]} ${
        isHighlighted ? "ring-2 ring-amber-400 shadow-lg shadow-amber-500/20" : ""
      }`}
    >
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                {order.order_number}
              </span>
              {isHighlighted ? (
                <Badge className="animate-pulse bg-amber-500 text-slate-950 font-semibold">
                  NEW
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-400">
              Ordered {formatTime(order.created_at)}
              {order.ready_at ? ` • Ready ${formatTime(order.ready_at)}` : ""}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Badge className="bg-slate-800 px-2.5 py-1 text-sm font-bold text-amber-300 border border-slate-700">
              Table {order.table_number}
            </Badge>
            <Badge
              variant="outline"
              className={`gap-1 text-xs font-semibold ${
                elapsed.severity === "urgent"
                  ? "border-rose-500 bg-rose-500/20 text-rose-300"
                  : elapsed.severity === "warning"
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-slate-700 text-slate-300"
              }`}
            >
              <Clock className="h-3 w-3" />
              {elapsed.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950/60">
          {order.items.map((item) => (
            <li key={item.id} className="px-3 py-2.5">
              <div className="flex items-baseline gap-2.5">
                <span className="inline-flex min-w-7 justify-center rounded bg-slate-800 px-1.5 py-0.5 text-base font-bold text-amber-300">
                  {item.quantity}x
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-snug text-white">
                    {item.item_name_snapshot}
                    {item.variant_name_snapshot ? (
                      <span className="ml-1.5 text-sm font-medium text-sky-300">
                        ({item.variant_name_snapshot})
                      </span>
                    ) : null}
                  </p>
                  {Array.isArray(item.addons_snapshot) &&
                  item.addons_snapshot.length > 0 ? (
                    <p className="mt-0.5 text-xs font-medium text-emerald-300">
                      + {item.addons_snapshot.map((a) => a.name).join(", ")}
                    </p>
                  ) : null}
                  {item.special_instructions ? (
                    <p className="mt-1 rounded bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-200">
                      Note: {item.special_instructions}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {order.special_instructions ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
            <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>Order note: {order.special_instructions}</span>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="border-t border-slate-800 bg-slate-900/60 pt-3">
        {order.status === "new" && canPrepare ? (
          <Button
            type="button"
            size="lg"
            disabled={isUpdating}
            onClick={() => onTransition(order.id, "preparing")}
            className="w-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ChefHat className="mr-2 h-4 w-4" />
            )}
            Accept Order
          </Button>
        ) : null}

        {order.status === "preparing" && canPrepare ? (
          <Button
            type="button"
            size="lg"
            disabled={isUpdating}
            onClick={() => onTransition(order.id, "ready")}
            className="w-full bg-sky-500 text-slate-950 font-bold hover:bg-sky-400"
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Mark as Ready
          </Button>
        ) : null}

        {order.status === "ready" ? (
          canServe ? (
            <Button
              type="button"
              size="lg"
              disabled={isUpdating}
              onClick={() => onTransition(order.id, "served")}
              className="w-full bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Utensils className="mr-2 h-4 w-4" />
              )}
              Mark as Served
            </Button>
          ) : (
            <p className="w-full text-center text-xs font-medium text-emerald-300">
              Ready for Waiter pickup
            </p>
          )
        ) : null}
      </CardFooter>
    </Card>
  );
}
