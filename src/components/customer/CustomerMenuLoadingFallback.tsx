import { UtensilsCrossed } from "lucide-react";

export function CustomerMenuLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="absolute h-80 w-80 rounded-full bg-amber-500/15 blur-3xl animate-pulse" />
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-500 shadow-2xl shadow-amber-500/30 animate-pulse">
          <UtensilsCrossed className="h-12 w-12 text-white drop-shadow-md" />
        </div>
        <div className="mt-6 h-6 w-36 rounded-md bg-muted animate-pulse" />
        <div className="mt-3 h-4 w-28 rounded-full bg-muted/60 animate-pulse" />
        <div className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
