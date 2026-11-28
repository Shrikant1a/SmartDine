"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Droplets,
  Loader2,
  MessageSquare,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CUSTOMER_TRANSLATIONS, type Language } from "@/lib/i18n/customer";
import { toast } from "sonner";

interface ServiceTabViewProps {
  tableNumber: string;
  qrToken?: string;
  lang: Language;
}

export function ServiceTabView({
  tableNumber,
  qrToken,
  lang,
}: ServiceTabViewProps) {
  const t = CUSTOMER_TRANSLATIONS[lang];
  const [customNote, setCustomNote] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [lastSentAction, setLastSentAction] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  async function handleSendCall(noteText: string) {
    if (cooldownSec > 0 || sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/waiter-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: `${noteText} • Table ${tableNumber}`,
          token: qrToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.retryAfterSeconds === "number") {
          setCooldownSec(data.retryAfterSeconds);
        }
        toast.error(data.error || "Could not contact staff right now.");
        return;
      }

      setCooldownSec(120);
      setLastSentAction(noteText);
      setCustomNote("");
      toast.success(data.message || `${noteText} sent for Table ${tableNumber}`);
    } catch {
      toast.error("Network error while notifying staff.");
    } finally {
      setSending(false);
    }
  }

  const QUICK_SERVICES = [
    {
      id: "call_waiter",
      label: t.callWaiter,
      icon: BellRing,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    },
    {
      id: "water",
      label: t.requestWater,
      icon: Droplets,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    },
    {
      id: "cutlery",
      label: t.requestCutlery,
      icon: Utensils,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
    },
    {
      id: "clean",
      label: t.cleanTable,
      icon: Sparkles,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.serviceMenu}</h2>
          <p className="text-xs text-muted-foreground">{t.serviceMenuDesc}</p>
        </div>
        <Badge className="bg-amber-600 text-white hover:bg-amber-600 shrink-0">
          {t.table} {tableNumber}
        </Badge>
      </div>

      {cooldownSec > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {lastSentAction
              ? `"${lastSentAction}" sent to staff. `
              : "Staff notified. "}
            Next request available in <strong>{cooldownSec}s</strong>.
          </span>
        </div>
      )}

      {/* 4 Primary Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK_SERVICES.map((serv) => {
          const IconComp = serv.icon;
          return (
            <button
              key={serv.id}
              type="button"
              disabled={sending || cooldownSec > 0}
              onClick={() => void handleSendCall(serv.label)}
              className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-5 text-center transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:border-amber-500/50 bg-card shadow-sm ${serv.color}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-xs">
                {sending ? (
                  <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                ) : (
                  <IconComp className="h-6 w-6" />
                )}
              </div>
              <span className="text-sm font-semibold text-foreground leading-tight">
                {serv.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5th Option: Other / Custom Note */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <MessageSquare className="h-4 w-4 text-amber-600" />
            {t.otherRequest}
          </CardTitle>
          <CardDescription className="text-xs">
            {t.customNotePlaceholder}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t.customNotePlaceholder}
            maxLength={120}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            disabled={sending || cooldownSec > 0}
          />
          <Button
            type="button"
            disabled={!customNote.trim() || sending || cooldownSec > 0}
            onClick={() => void handleSendCall(customNote.trim())}
            className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700 font-semibold text-sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {t.sendRequest}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
