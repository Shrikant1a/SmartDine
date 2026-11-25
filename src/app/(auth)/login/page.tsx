import { Suspense } from "react";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/shared/LoginForm";

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm redirectTarget={params.redirect} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">SmartDine Staff Sign In</CardTitle>
          <CardDescription>
            Sign in with your assigned Owner, Manager, Kitchen, or Waiter credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<div className="h-44 animate-pulse rounded-lg bg-muted" />}>
            <LoginContent searchParams={searchParams} />
          </Suspense>
          <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              ← Back to home
            </Link>
            <Link href="/bootstrap" className="hover:text-foreground">
              First-time owner setup
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
