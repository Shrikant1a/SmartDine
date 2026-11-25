"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export function BootstrapForm() {
  const router = useRouter();
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [restaurantName, setRestaurantName] = useState("SmartDine Bistro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bootstrapSecret,
          restaurantName,
          name,
          email,
          password,
        }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        data = text ? (JSON.parse(text) as { error?: string }) : {};
      } catch {
        setError(`Server error (HTTP ${res.status}). Please check terminal logs.`);
        return;
      }

      if (!res.ok) {
        setError(data.error || `Owner bootstrap failed (HTTP ${res.status}).`);
        return;
      }

      toast.success("Owner account provisioned! Please sign in.");
      router.push("/login");
    } catch {
      setError(
        "Could not reach the server. Make sure `npm run dev` is running and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="bootstrapSecret">Owner Bootstrap Secret</Label>
        <Input
          id="bootstrapSecret"
          type="password"
          placeholder="Enter one-time setup secret"
          value={bootstrapSecret}
          onChange={(e) => setBootstrapSecret(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="restaurantName">Restaurant Name</Label>
        <Input
          id="restaurantName"
          type="text"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerName">Owner Full Name</Label>
        <Input
          id="ownerName"
          type="text"
          placeholder="Aarav Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerEmail">Owner Email</Label>
        <Input
          id="ownerEmail"
          type="email"
          placeholder="owner@smartdine.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerPassword">Password (min 10 characters)</Label>
        <Input
          id="ownerPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldPlus className="mr-2 h-4 w-4" />
        )}
        Provision Owner Account
      </Button>
    </form>
  );
}
