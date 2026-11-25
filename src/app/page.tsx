import Link from "next/link";
import {
  ChefHat,
  ClipboardCheck,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-background">
      <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <div className="flex flex-col items-start gap-4">
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-800">
            SmartDine Platform • Phase 0 Foundation
          </Badge>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">SmartDine</h1>
              <p className="text-sm text-muted-foreground">
                QR-Based Restaurant Ordering &amp; Operations Management
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-base text-muted-foreground">
            Guests scan their table QR code to order and track dishes live. Staff access dedicated, role-protected portals for the Kitchen Display System, Waiter Service, and Owner Dashboard.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/login" className={buttonVariants({ variant: "default" })}>
              Staff Sign In
            </Link>
            <Link href="/bootstrap" className={buttonVariants({ variant: "outline" })}>
              Initial Owner Setup
            </Link>
            <Link href="/api/health" className={buttonVariants({ variant: "ghost" })}>
              System Health Check
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <QrCode className="mb-2 h-6 w-6 text-amber-600" />
              <CardTitle className="text-base">Customer QR App</CardTitle>
              <CardDescription>Table-verified digital menu &amp; live tracking</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Accessed via <code className="rounded bg-muted px-1 py-0.5">/menu/[token]</code>.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <ChefHat className="mb-2 h-6 w-6 text-emerald-600" />
              <CardTitle className="text-base">Kitchen Display</CardTitle>
              <CardDescription>Live New, Preparing &amp; Ready order board</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/kitchen" className="text-xs font-medium text-primary hover:underline">
                Open KDS Portal →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <ClipboardCheck className="mb-2 h-6 w-6 text-purple-600" />
              <CardTitle className="text-base">Waiter Service</CardTitle>
              <CardDescription>Table calls &amp; order serving workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/waiter" className="text-xs font-medium text-primary hover:underline">
                Open Waiter Portal →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <LayoutDashboard className="mb-2 h-6 w-6 text-blue-600" />
              <CardTitle className="text-base">Owner Admin</CardTitle>
              <CardDescription>Menu, tables, QR codes, staff &amp; analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin" className="text-xs font-medium text-primary hover:underline">
                Open Admin Dashboard →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 flex items-center gap-2 rounded-xl border bg-card p-4 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Every staff route is guarded by Supabase Auth, server-side RBAC checks, and PostgreSQL Row Level Security across all 14 database tables.
          </span>
        </div>
      </div>
    </main>
  );
}
