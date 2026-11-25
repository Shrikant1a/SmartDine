"use client";

import { useMemo, useState } from "react";
import { Banknote, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/services/pricing";
import type { Order, OrderItem } from "@/types/database";
import type { OrderStatus } from "@/constants/roles";
import { toast } from "sonner";

type AdminOrderRow = Order & {
  table_number: string;
  items: OrderItem[];
};

export function OrdersManager({
  initialOrders,
  isOwner = false,
}: {
  initialOrders: AdminOrderRow[];
  isOwner?: boolean;
}) {
  const [orders, setOrders] = useState<AdminOrderRow[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment_status !== paymentFilter)
        return false;
      if (q) {
        const hay =
          `${o.order_number} ${o.table_number} ${o.customer_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, query]);

  async function markCashPaid(order: AdminOrderRow) {
    const res = await fetch(`/api/admin/orders/${order.id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "paid" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not update payment");
      return;
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, payment_status: "paid" } : o,
      ),
    );
    toast.success(`Marked ${order.order_number} as Paid`);
  }

  async function refundOrder(order: AdminOrderRow) {
    if (!confirm(`Issue refund for ${order.order_number} (${formatINR(order.total_amount)})?`)) {
      return;
    }
    const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Owner issued refund from dashboard" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Refund failed");
      return;
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, payment_status: "refunded" } : o,
      ),
    );
    toast.success(`Refunded ${order.order_number}`);
  }

  async function updateOrderStatus(order: AdminOrderRow, status: OrderStatus) {
    const res = await fetch(`/api/kitchen/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not update order status");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status } : o)),
    );
    toast.success(`Order ${order.order_number} -> ${status}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
        <p className="text-sm text-muted-foreground">
          Inspect all orders, filter by status or payment, settle cash/counter payments, and view item snapshots.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order #, table, guest..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Order Statuses</option>
          <option value="new">New</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="served">Served</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Payment Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No matching orders found.
            </p>
          ) : (
            filtered.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{order.order_number}</span>
                    <Badge variant="outline">Table {order.table_number}</Badge>
                    <Badge variant="secondary" className="capitalize">
                      {order.status}
                    </Badge>
                    <Badge
                      variant={
                        order.payment_status === "paid" ? "default" : "outline"
                      }
                      className="capitalize"
                    >
                      {order.payment_mode.replace("_", " ")}: {order.payment_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.items.length} items •{" "}
                    {new Date(order.created_at).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-2 font-bold">
                    {formatINR(order.total_amount)}
                  </span>

                  {order.payment_mode !== "online" &&
                  order.payment_status === "pending" &&
                  order.status !== "cancelled" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void markCashPaid(order)}
                    >
                      <Banknote className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Mark Paid
                    </Button>
                  ) : null}

                  {isOwner && order.payment_status === "paid" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void refundOrder(order)}
                    >
                      Refund
                    </Button>
                  ) : null}

                  {order.status !== "served" && order.status !== "cancelled" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void updateOrderStatus(order, "cancelled")}
                    >
                      Cancel
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(o) => !o && setSelectedOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.order_number} • Table {selectedOrder?.table_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder ? (
            <div className="space-y-3 text-sm">
              {selectedOrder.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">
                      {it.quantity}x {it.item_name_snapshot}
                      {it.variant_name_snapshot
                        ? ` (${it.variant_name_snapshot})`
                        : ""}
                    </p>
                    {it.special_instructions ? (
                      <p className="text-xs italic text-muted-foreground">
                        {it.special_instructions}
                      </p>
                    ) : null}
                  </div>
                  <span>{formatINR(it.line_total)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatINR(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST</span>
                <span>{formatINR(selectedOrder.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatINR(selectedOrder.total_amount)}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
