"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ErrorState
          title="Unexpected application error"
          description="Something interrupted this view. Try refreshing, or sign in again if your session expired."
          onRetry={reset}
        />
      </div>
    </div>
  );
}
