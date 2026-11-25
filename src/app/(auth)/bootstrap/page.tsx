import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BootstrapForm } from "@/components/shared/BootstrapForm";

export default function BootstrapPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Controlled Owner Bootstrap</CardTitle>
          <CardDescription>
            Provisions the initial restaurant Owner account. Automatically locks once an active Owner exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BootstrapForm />
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            Already configured?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
