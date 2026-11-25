"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function WifiDialogButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wifi, setWifi] = useState<{ ssid: string | null; password: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !wifi) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/table/wifi");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Unable to fetch Wi-Fi details.");
        } else {
          setWifi(data);
        }
      } catch {
        setError("Network error while loading Wi-Fi details.");
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleCopy() {
    if (!wifi?.password) return;
    try {
      await navigator.clipboard.writeText(wifi.password);
      setCopied(true);
      toast.success("Wi-Fi password copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Unable to copy password automatically");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-amber-600" />
            <span>Wi-Fi</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-amber-600" />
            Restaurant Guest Wi-Fi
          </DialogTitle>
          <DialogDescription>
            Connect to our complimentary Wi-Fi while you dine.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading Wi-Fi credentials...
          </div>
        ) : error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Network Name (SSID)
              </p>
              <p className="mt-1 font-mono text-sm font-semibold">
                {wifi?.ssid || "Not configured"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {wifi?.password || "No password set"}
                </p>
              </div>
              {wifi?.password ? (
                <Button size="sm" variant="secondary" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
