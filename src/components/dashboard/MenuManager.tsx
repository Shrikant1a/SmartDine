"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VegIndicator } from "@/components/customer/VegIndicator";
import { formatINR } from "@/services/pricing";
import type { Category } from "@/types/database";
import type { MenuItemWithOptions } from "@/services/customer-menu";
import { toast } from "sonner";

interface VariantDraft {
  name: string;
  price: string;
  isDefault: boolean;
}

interface AddonDraft {
  name: string;
  price: string;
}

export function MenuManager({
  categories,
  initialItems,
}: {
  categories: Category[];
  initialItems: MenuItemWithOptions[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<MenuItemWithOptions[]>(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [gstPercent, setGstPercent] = useState("5");
  const [stockQty, setStockQty] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const [isRecommended, setIsRecommended] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [addons, setAddons] = useState<AddonDraft[]>([]);

  function openNew() {
    setEditingId(null);
    setCategoryId(categories[0]?.id ?? "");
    setName("");
    setDescription("");
    setImageUrl("");
    setBasePrice("");
    setGstPercent("5");
    setStockQty("");
    setIsVeg(true);
    setIsRecommended(false);
    setIsPopular(false);
    setIsAvailable(true);
    setVariants([]);
    setAddons([]);
    setDialogOpen(true);
  }

  function openEdit(item: MenuItemWithOptions) {
    setEditingId(item.id);
    setCategoryId(item.category_id);
    setName(item.name);
    setDescription(item.description ?? "");
    setImageUrl(item.image_url ?? "");
    setBasePrice(String(item.base_price));
    setGstPercent(String(item.gst_percent));
    setStockQty(item.stock_qty !== null ? String(item.stock_qty) : "");
    setIsVeg(item.is_veg);
    setIsRecommended(item.is_recommended);
    setIsPopular(item.is_popular);
    setIsAvailable(item.is_available);
    setVariants(
      item.variants.map((v) => ({
        name: v.name,
        price: String(v.price),
        isDefault: v.is_default,
      })),
    );
    setAddons(
      item.addons.map((a) => ({
        name: a.name,
        price: String(a.price),
      })),
    );
    setDialogOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }
      setImageUrl(data.url);
      toast.success("Image uploaded to Supabase Storage");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        categoryId,
        name,
        description,
        imageUrl,
        basePrice: Number(basePrice),
        gstPercent: Number(gstPercent) || 5,
        isVeg,
        isRecommended,
        isPopular,
        isAvailable,
        stockQty: stockQty.trim() === "" ? null : Number(stockQty),
        variants: variants
          .filter((v) => v.name.trim())
          .map((v) => ({
            name: v.name.trim(),
            price: Number(v.price) || 0,
            isDefault: v.isDefault,
            isAvailable: true,
          })),
        addons: addons
          .filter((a) => a.name.trim())
          .map((a) => ({
            name: a.name.trim(),
            price: Number(a.price) || 0,
            isAvailable: true,
          })),
      };

      const url = editingId ? `/api/admin/menu/${editingId}` : "/api/admin/menu";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save item");
        return;
      }

      const refreshed = await fetch("/api/admin/menu");
      if (refreshed.ok) {
        const next = await refreshed.json();
        setItems(next.items);
      }
      setDialogOpen(false);
      toast.success(editingId ? "Dish updated" : "Dish added to menu");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleSoldOut(item: MenuItemWithOptions) {
    const res = await fetch(`/api/admin/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.is_available }),
    });
    if (!res.ok) {
      toast.error("Failed to update availability");
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_available: !item.is_available } : i,
      ),
    );
    toast.success(
      `${item.name} marked ${!item.is_available ? "Available" : "Sold Out"}`,
    );
  }

  async function handleArchive(item: MenuItemWithOptions) {
    if (!confirm(`Archive "${item.name}" from the menu?`)) return;
    const res = await fetch(`/api/admin/menu/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to archive item");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success(`Archived ${item.name}`);
  }

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage dishes, prices, GST, variants, add-ons, and live Sold Out toggles.
          </p>
        </div>
        <Button type="button" onClick={openNew} disabled={categories.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Menu Item
        </Button>
      </div>

      <div className="grid gap-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No menu items found. Add a category and create your first dish.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <VegIndicator isVeg={item.is_veg} />
                    <span className="font-semibold">{item.name}</span>
                    <Badge variant="outline">{catName(item.category_id)}</Badge>
                    <Badge variant={item.is_available ? "default" : "destructive"}>
                      {item.is_available ? "Available" : "Sold Out"}
                    </Badge>
                    {item.stock_qty !== null ? (
                      <Badge variant="secondary">Stock: {item.stock_qty}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Base: {formatINR(item.base_price)} • GST {item.gst_percent}%
                    {item.variants.length > 0
                      ? ` • ${item.variants.length} variants`
                      : ""}
                    {item.addons.length > 0 ? ` • ${item.addons.length} add-ons` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={item.is_available ? "outline" : "default"}
                    onClick={() => void toggleSoldOut(item)}
                  >
                    {item.is_available ? "Mark Sold Out" : "Mark Available"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(item)}
                  >
                    <Edit className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleArchive(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="itemCat">Category</Label>
                <select
                  id="itemCat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="itemName">Dish Name</Label>
                <Input
                  id="itemName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="itemDesc">Description</Label>
              <Textarea
                id="itemDesc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="itemPrice">Base Price (₹)</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="itemGst">GST %</Label>
                <Input
                  id="itemGst"
                  type="number"
                  step="0.5"
                  min={0}
                  max={28}
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="itemStock">Stock Qty (optional)</Label>
                <Input
                  id="itemStock"
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Dish Image</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://... or upload"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploading ? "Uploading..." : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e)}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                />
                Vegetarian
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isRecommended}
                  onChange={(e) => setIsRecommended(e.target.checked)}
                />
                Recommended
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                />
                Popular
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                />
                Available
              </label>
            </div>

            {/* Variants */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Variants (e.g., Small/Medium/Large)</Label>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setVariants((v) => [
                      ...v,
                      { name: "", price: basePrice || "0", isDefault: v.length === 0 },
                    ])
                  }
                >
                  + Variant
                </Button>
              </div>
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Name"
                    value={v.name}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    className="w-28"
                    placeholder="Price"
                    value={v.price}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, price: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      setVariants((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>

            {/* Add-ons */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Add-ons (e.g., Extra Cheese)</Label>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setAddons((a) => [...a, { name: "", price: "0" }])}
                >
                  + Add-on
                </Button>
              </div>
              {addons.map((a, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Add-on name"
                    value={a.name}
                    onChange={(e) =>
                      setAddons((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    className="w-28"
                    placeholder="Price"
                    value={a.price}
                    onChange={(e) =>
                      setAddons((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, price: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      setAddons((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
