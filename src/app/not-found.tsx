import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
        <UtensilsCrossed className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The table link or page you requested does not exist. Guests should scan the QR code placed on their dining table.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Go home
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Staff sign in
        </Link>
      </div>
    </div>
  );
}
