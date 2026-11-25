"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Restaurant } from "@/types/database";
import { toast } from "sonner";

export function SettingsManager({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description ?? "");
  const [address, setAddress] = useState(restaurant.address ?? "");
  const [phone, setPhone] = useState(restaurant.phone ?? "");
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url ?? "");
  const [gstNumber, setGstNumber] = useState(restaurant.gst_number ?? "");
  const [defaultGstPercent, setDefaultGstPercent] = useState(
    String(restaurant.default_gst_percent),
  );
  const [serviceChargePercent, setServiceChargePercent] = useState(
    String(restaurant.service_charge_percent),
  );
  const [wifiSsid, setWifiSsid] = useState(restaurant.wifi_ssid ?? "");
  const [wifiPassword, setWifiPassword] = useState(restaurant.wifi_password ?? "");
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    restaurant.google_review_url ?? "",
  );
  const [ownerWhatsapp, setOwnerWhatsapp] = useState(
    restaurant.owner_whatsapp ?? "",
  );
  const [kitchenWhatsapp, setKitchenWhatsapp] = useState(
    restaurant.kitchen_whatsapp ?? "",
  );
  const [isOpen, setIsOpen] = useState(restaurant.is_open);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          address,
          phone,
          logoUrl,
          gstNumber,
          defaultGstPercent: Number(defaultGstPercent) || 5,
          serviceChargePercent: Number(serviceChargePercent) || 0,
          wifiSsid,
          wifiPassword,
          googleReviewUrl,
          ownerWhatsapp,
          kitchenWhatsapp,
          isOpen,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save settings");
        return;
      }
      toast.success("Restaurant settings saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Restaurant Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure restaurant branding, taxes, guest Wi-Fi, WhatsApp recipients, and Google Review URL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General &amp; Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rName">Restaurant Name</Label>
              <Input
                id="rName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rPhone">Phone</Label>
              <Input
                id="rPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rDesc">Description</Label>
            <Textarea
              id="rDesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rAddr">Address</Label>
              <Input
                id="rAddr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rLogo">Logo URL</Label>
              <Input
                id="rLogo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 pt-1 text-sm font-medium">
            <input
              type="checkbox"
              checked={isOpen}
              onChange={(e) => setIsOpen(e.target.checked)}
            />
            Restaurant Open for Customer QR Ordering
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taxes &amp; Charges</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="rGstNum">GSTIN Number</Label>
            <Input
              id="rGstNum"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rGstPct">Default GST %</Label>
            <Input
              id="rGstPct"
              type="number"
              step="0.5"
              value={defaultGstPercent}
              onChange={(e) => setDefaultGstPercent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rSvcPct">Service Charge %</Label>
            <Input
              id="rSvcPct"
              type="number"
              step="0.5"
              value={serviceChargePercent}
              onChange={(e) => setServiceChargePercent(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guest Wi-Fi, WhatsApp &amp; Reviews</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wSsid">Guest Wi-Fi SSID</Label>
            <Input
              id="wSsid"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wPass">Guest Wi-Fi Password</Label>
            <Input
              id="wPass"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oWa">Owner WhatsApp (+91...)</Label>
            <Input
              id="oWa"
              value={ownerWhatsapp}
              onChange={(e) => setOwnerWhatsapp(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kWa">Kitchen WhatsApp (+91...)</Label>
            <Input
              id="kWa"
              value={kitchenWhatsapp}
              onChange={(e) => setKitchenWhatsapp(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="gRev">Google Review Link</Label>
            <Input
              id="gRev"
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Settings
      </Button>
    </form>
  );
}
