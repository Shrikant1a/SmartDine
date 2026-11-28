"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/services/pricing";
import { CUSTOMER_TRANSLATIONS, type Language } from "@/lib/i18n/customer";
import type { Order, OrderItem } from "@/types/database";
import { toast } from "sonner";

interface BillTabViewProps {
  tableNumber: string;
  qrToken?: string;
  lang: Language;
  onExploreMenu: () => void;
}

type OrderWithItems = Order & { items: OrderItem[] };

export function BillTabView({
  tableNumber,
  qrToken,
  lang,
  onExploreMenu,
}: BillTabViewProps) {
  const t = CUSTOMER_TRANSLATIONS[lang];
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingBill, setRequestingBill] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

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
    const timer = setInterval(fetchOrders, 8000);
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
      // keep existing
    } finally {
      setRefreshing(false);
    }
  }

  // Aggregate all ordered items across non-cancelled table orders
  const { aggregatedItems, subtotal, taxAmount, serviceCharge, totalAmount, allPaid } =
    useMemo(() => {
      const nonCancelled = orders.filter((o) => o.status !== "cancelled");
      let sub = 0;
      let tax = 0;
      let service = 0;
      let total = 0;

      const itemMap = new Map<
        string,
        {
          name: string;
          variant: string | null;
          quantity: number;
          lineTotal: number;
        }
      >();

      for (const ord of nonCancelled) {
        sub += ord.subtotal || 0;
        tax += ord.tax_amount || 0;
        service += ord.service_charge || 0;
        total += ord.total_amount || 0;

        for (const it of ord.items || []) {
          const key = `${it.menu_item_id}::${it.variant_name_snapshot ?? ""}`;
          const existing = itemMap.get(key);
          if (existing) {
            existing.quantity += it.quantity;
            existing.lineTotal += it.line_total;
          } else {
            itemMap.set(key, {
              name: it.item_name_snapshot,
              variant: it.variant_name_snapshot,
              quantity: it.quantity,
              lineTotal: it.line_total,
            });
          }
        }
      }

      const allPaidStatus =
        nonCancelled.length > 0 &&
        nonCancelled.every((o) => o.payment_status === "paid");

      return {
        aggregatedItems: Array.from(itemMap.values()),
        subtotal: sub,
        taxAmount: tax,
        serviceCharge: service,
        totalAmount: total,
        allPaid: allPaidStatus,
      };
    }, [orders]);

  async function handleRequestBill() {
    setRequestingBill(true);
    try {
      const res = await fetch("/api/waiter-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: `Ready to pay bill for Table ${tableNumber} (Total: ${formatINR(totalAmount)})`,
          token: qrToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not request bill at this moment.");
        return;
      }
      setBillRequested(true);
      toast.success(t.billRequested);
    } catch {
      toast.error("Network error while notifying staff.");
    } finally {
      setRequestingBill(false);
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-6 w-36 rounded bg-muted" />
        <div className="h-60 rounded-xl bg-muted" />
      </div>
    );
  }

  if (orders.length === 0 || aggregatedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <Receipt className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t.noBill}</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {t.noBillDesc}
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
          <h2 className="text-xl font-bold tracking-tight">{t.tableBill}</h2>
          <Badge
            variant={allPaid ? "secondary" : "default"}
            className={allPaid ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}
          >
            {allPaid ? t.paid : t.pendingPayment}
          </Badge>
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

      {/* Bill Receipt Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">
              {t.table} {tableNumber} • Summary
            </span>
            <span className="text-muted-foreground">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="divide-y p-0">
          {/* Itemized List */}
          <div className="p-4 space-y-2.5">
            {aggregatedItems.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {item.name} <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                  </p>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground">({item.variant})</p>
                  )}
                </div>
                <span className="font-semibold">{formatINR(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="space-y-2 bg-muted/10 p-4 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{t.subtotal}</span>
              <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t.taxGst}</span>
              <span className="font-medium text-foreground">{formatINR(taxAmount)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t.serviceCharge}</span>
                <span className="font-medium text-foreground">{formatINR(serviceCharge)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>{t.grandTotal}</span>
              <span className="text-amber-600 dark:text-amber-400">{formatINR(totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      {!allPaid ? (
        <Button
          type="button"
          size="lg"
          disabled={requestingBill || billRequested}
          onClick={() => void handleRequestBill()}
          className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-md text-base"
        >
          {requestingBill ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : billRequested ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <CreditCard className="h-5 w-5" />
          )}
          {billRequested ? t.billRequested : t.requestBill}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <span>All orders for Table {tableNumber} have been paid. Thank you!</span>
        </div>
      )}
    </div>
  );
}
