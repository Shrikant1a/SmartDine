"use client";

import { useState } from "react";
import QRCode from "qrcode";
import {
  Download,
  Loader2,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RestaurantTable } from "@/types/database";
import { toast } from "sonner";

type TableRow = Omit<RestaurantTable, "qr_token_hash">;

interface GeneratedQrState {
  tableNumber: string;
  label: string | null;
  fullUrl: string;
  pngDataUrl: string;
  svgString: string;
}

export function TablesQrManager({
  initialTables,
  siteUrl,
}: {
  initialTables: TableRow[];
  siteUrl: string;
}) {
  const [tables, setTables] = useState<TableRow[]>(initialTables);
  const [tableNumber, setTableNumber] = useState("");
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [creating, setCreating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [activeQr, setActiveQr] = useState<GeneratedQrState | null>(null);
  const [qrHistory, setQrHistory] = useState<Record<string, GeneratedQrState>>({});

  async function buildQrPreview(tbl: TableRow, qrPath: string) {
    const base =
      typeof window !== "undefined" ? window.location.origin : siteUrl;
    const fullUrl = `${base}${qrPath}`;
    const [pngDataUrl, svgString] = await Promise.all([
      QRCode.toDataURL(fullUrl, { width: 512, margin: 2 }),
      QRCode.toString(fullUrl, { type: "svg", margin: 2 }),
    ]);

    const preview: GeneratedQrState = {
      tableNumber: tbl.table_number,
      label: tbl.label,
      fullUrl,
      pngDataUrl,
      svgString,
    };
    setQrHistory((prev) => ({ ...prev, [tbl.id]: preview }));
    setActiveQr(preview);
  }

  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber,
          label,
          capacity: Number(capacity) || 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add table");
        return;
      }

      setTables((prev) => [...prev, data.table]);
      setTableNumber("");
      setLabel("");
      toast.success(`Table ${data.table.table_number} created with unique QR`);
      await buildQrPreview(data.table, data.qrPath);
    } finally {
      setCreating(false);
    }
  }

  async function handleRegenerate(tbl: TableRow) {
    if (
      !confirm(
        `Regenerate QR for Table ${tbl.table_number}? The previous printed QR code will immediately stop working.`,
      )
    ) {
      return;
    }

    setRegeneratingId(tbl.id);
    try {
      const res = await fetch(`/api/admin/tables/${tbl.id}/regenerate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to regenerate QR");
        return;
      }
      setTables((prev) => prev.map((t) => (t.id === tbl.id ? data.table : t)));
      toast.success(`New QR token generated (v${data.table.token_version})`);
      await buildQrPreview(data.table, data.qrPath);
    } finally {
      setRegeneratingId(null);
    }
  }

  async function toggleActive(tbl: TableRow) {
    const res = await fetch(`/api/admin/tables/${tbl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isActive: !tbl.is_active,
        status: !tbl.is_active ? "available" : "inactive",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to update table");
      return;
    }
    setTables((prev) => prev.map((t) => (t.id === tbl.id ? data.table : t)));
    toast.success(
      `Table ${tbl.table_number} ${data.table.is_active ? "activated" : "disabled"}`,
    );
  }

  function downloadPng(qr: GeneratedQrState) {
    const link = document.createElement("a");
    link.href = qr.pngDataUrl;
    link.download = `smartdine-table-${qr.tableNumber}.png`;
    link.click();
  }

  function downloadSvg(qr: GeneratedQrState) {
    const blob = new Blob([qr.svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartdine-table-${qr.tableNumber}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printA4Sheet() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tables &amp; QR Codes</h1>
          <p className="text-sm text-muted-foreground">
            Manage dining tables, generate cryptographic QR stands, download PNG/SVG, and print A4 sheets.
          </p>
        </div>
        {Object.keys(qrHistory).length > 0 ? (
          <Button type="button" variant="outline" onClick={printA4Sheet}>
            <Printer className="mr-2 h-4 w-4" />
            Print A4 QR Sheet ({Object.keys(qrHistory).length})
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Table</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTable} className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="tblNum">Table Number</Label>
              <Input
                id="tblNum"
                placeholder="e.g., T6"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tblLabel">Area / Label</Label>
              <Input
                id="tblLabel"
                placeholder="e.g., Garden Patio 6"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="w-24 space-y-1.5">
                <Label htmlFor="tblCap">Seats</Label>
                <Input
                  id="tblCap"
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={creating} className="flex-1">
                {creating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((tbl) => {
          const cachedQr = qrHistory[tbl.id];
          return (
            <Card key={tbl.id} className={!tbl.is_active ? "opacity-60" : ""}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        Table {tbl.table_number}
                      </span>
                      <Badge variant={tbl.is_active ? "default" : "secondary"}>
                        {tbl.is_active ? tbl.status : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tbl.label || "Standard dining"} • {tbl.capacity} seats • Token v
                      {tbl.token_version}
                    </p>
                  </div>
                  <QrCode className="h-5 w-5 text-amber-600" />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={regeneratingId === tbl.id}
                    onClick={() => void handleRegenerate(tbl)}
                  >
                    {regeneratingId === tbl.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {cachedQr ? "Rotate QR" : "Generate / Rotate QR"}
                  </Button>
                  {cachedQr ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveQr(cachedQr)}
                    >
                      View QR
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggleActive(tbl)}
                  >
                    {tbl.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Printable A4 Sheet (visible when printing) */}
      {Object.keys(qrHistory).length > 0 ? (
        <div className="hidden print:grid print:grid-cols-2 print:gap-8 print:p-6">
          {Object.values(qrHistory).map((qr) => (
            <div
              key={qr.fullUrl}
              className="flex flex-col items-center rounded-xl border-2 border-slate-800 p-6 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                SmartDine Digital Menu
              </p>
              <h2 className="mt-1 text-2xl font-bold">Table {qr.tableNumber}</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.pngDataUrl}
                alt={`QR for Table ${qr.tableNumber}`}
                className="my-3 h-48 w-48"
              />
              <p className="text-xs text-slate-600">
                Scan with your phone camera to order &amp; pay
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <Dialog open={Boolean(activeQr)} onOpenChange={(o) => !o && setActiveQr(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Table {activeQr?.tableNumber} QR Code</DialogTitle>
            <DialogDescription>
              Raw QR URL is only displayed at generation time for security. Download or print this stand now.
            </DialogDescription>
          </DialogHeader>
          {activeQr ? (
            <div className="space-y-4">
              <div className="mx-auto flex w-fit justify-center rounded-xl border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeQr.pngDataUrl}
                  alt={`Table ${activeQr.tableNumber} QR`}
                  className="h-52 w-52"
                />
              </div>
              <p className="break-all rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground">
                {activeQr.fullUrl}
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadPng(activeQr)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  PNG
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => downloadSvg(activeQr)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  SVG
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={printA4Sheet}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
