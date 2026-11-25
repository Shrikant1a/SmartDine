import Link from "next/link";
import { ShieldBan } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffSignOutButton } from "@/components/shared/StaffSignOutButton";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldBan className="h-6 w-6" />
          </div>
          <CardTitle>Access Restricted</CardTitle>
          <CardDescription>
            Your current staff role does not have permission to view this portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className={buttonVariants({ variant: "default" })}>
            Switch Account
          </Link>
          <StaffSignOutButton />
        </CardContent>
      </Card>
    </main>
  );
}
