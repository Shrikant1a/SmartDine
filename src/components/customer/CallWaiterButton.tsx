"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const QUICK_REASONS = [
  "Need water / glasses",
  "Need cutlery / napkins",
  "Ready to pay bill",
  "Table assistance",
];

export function CallWaiterButton({
  tableNumber,
  className = "",
}: {
  tableNumber: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  async function sendCall(customNote?: string) {
    setSending(true);
    try {
      const res = await fetch("/api/waiter-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: (customNote ?? note).trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.retryAfterSeconds === "number") {
          setCooldownSec(data.retryAfterSeconds);
        }
        toast.error(data.error || "Could not call waiter right now.");
        return;
      }

      setCooldownSec(120);
      setNote("");
      setOpen(false);
      toast.success(data.message || `Waiter called for Table ${tableNumber}`);
    } catch {
      toast.error("Network error while notifying waiter.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cooldownSec > 0}
            className={`gap-1.5 border-amber-500/40 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200 ${className}`}
          >
            <BellRing className="h-3.5 w-3.5 text-amber-600" />
            <span>
              {cooldownSec > 0 ? `Waiter Notified (${cooldownSec}s)` : "Call Waiter"}
            </span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-amber-600" />
            Call Waiter • Table {tableNumber}
          </DialogTitle>
          <DialogDescription>
            Select a quick request or add an optional note for your server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((reason) => (
              <Button
                key={reason}
                type="button"
                size="xs"
                variant="outline"
                disabled={sending}
                onClick={() => void sendCall(reason)}
              >
                {reason}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="waiterNote">Custom Note (Optional)</Label>
            <Input
              id="waiterNote"
              placeholder="e.g., Extra plates please"
              maxLength={160}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={sending || cooldownSec > 0}
            onClick={() => void sendCall()}
            className="w-full bg-amber-600 text-white hover:bg-amber-700"
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="mr-2 h-4 w-4" />
            )}
            Notify Waiter Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
