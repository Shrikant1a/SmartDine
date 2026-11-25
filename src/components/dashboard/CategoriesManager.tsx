"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/types/database";
import { toast } from "sonner";

export function CategoriesManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          sortOrder: Number(sortOrder) || 0,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create category");
        return;
      }
      setCategories((prev) =>
        [...prev, data.category].sort((a, b) => a.sort_order - b.sort_order),
      );
      setName("");
      setDescription("");
      toast.success("Category added");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cat.is_active }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to update category");
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? data.category : c)));
    toast.success(`${cat.name} ${data.category.is_active ? "enabled" : "hidden"}`);
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Cannot delete category");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    toast.success("Category deleted");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Organize menu sections and control display sort order.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="catName">Name</Label>
              <Input
                id="catName"
                placeholder="e.g., Chinese"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="catDesc">Description</Label>
              <Input
                id="catDesc"
                placeholder="Optional short subtitle"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="w-20 space-y-1.5">
                <Label htmlFor="catOrder">Order</Label>
                <Input
                  id="catOrder"
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
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

      <Card>
        <CardContent className="divide-y p-0">
          {categories.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No categories yet.
            </p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{cat.name}</span>
                    <Badge variant="outline">#{cat.sort_order}</Badge>
                    <Badge variant={cat.is_active ? "default" : "secondary"}>
                      {cat.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  {cat.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void toggleActive(cat)}
                  >
                    {cat.is_active ? "Hide" : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleDelete(cat)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
