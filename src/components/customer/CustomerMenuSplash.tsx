"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, UtensilsCrossed } from "lucide-react";
import { CUSTOMER_TRANSLATIONS, type Language } from "@/lib/i18n/customer";

interface CustomerMenuSplashProps {
  restaurantName: string;
  logoUrl?: string | null;
  tableNumber: string;
  lang: Language;
  onFinished: () => void;
}

export function CustomerMenuSplash({
  restaurantName,
  logoUrl,
  tableNumber,
  lang,
  onFinished,
}: CustomerMenuSplashProps) {
  const t = CUSTOMER_TRANSLATIONS[lang];
  const [phase, setPhase] = useState<"enter" | "active" | "exit">("enter");

  useEffect(() => {
    // Start entrance animation
    const enterTimer = setTimeout(() => {
      setPhase("active");
    }, 40);

    // Auto transition to exit after smooth logo reveal (~1.3s)
    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, 1300);

    // Trigger onFinished after smooth fade-out (~500ms)
    const finishTimer = setTimeout(() => {
      onFinished();
    }, 1800);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  function handleSkip() {
    setPhase("exit");
    setTimeout(onFinished, 300);
  }

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-background/95 backdrop-blur-xl transition-all duration-500 ease-in-out ${
        phase === "exit"
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      aria-label="Welcome screen"
    >
      {/* Ambient background glow */}
      <div className="absolute h-80 w-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Animated Brand Logo */}
        <div
          className={`relative mb-6 transition-all duration-700 ease-out ${
            phase === "enter"
              ? "opacity-0 scale-75 -translate-y-4"
              : "opacity-100 scale-100 translate-y-0"
          }`}
        >
          {logoUrl ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-3xl border-2 border-amber-500/30 shadow-2xl shadow-amber-500/20">
              <Image
                src={logoUrl}
                alt={restaurantName}
                fill
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-500 shadow-2xl shadow-amber-500/30">
              <UtensilsCrossed className="h-12 w-12 text-white drop-shadow-md" />
              <div className="absolute -inset-1 rounded-3xl bg-amber-400/25 blur-lg" />
            </div>
          )}

          {/* Sparkle badge */}
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white shadow-md">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Restaurant Name & Table Badge */}
        <div
          className={`space-y-2.5 transition-all duration-700 delay-100 ease-out ${
            phase === "enter"
              ? "opacity-0 translate-y-3"
              : "opacity-100 translate-y-0"
          }`}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
            {restaurantName}
          </h1>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {t.table} {tableNumber} • {t.digitalMenu}
            </span>
          </div>
        </div>

        {/* Animated Loading Bar & Status */}
        <div
          className={`mt-8 space-y-2.5 transition-all duration-700 delay-200 ease-out ${
            phase === "enter"
              ? "opacity-0 translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="h-1 w-44 overflow-hidden rounded-full bg-muted/60">
            <div
              className={`h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all duration-1000 ease-out ${
                phase === "enter" ? "w-0" : "w-full"
              }`}
            />
          </div>

          <p className="text-xs font-medium text-muted-foreground animate-pulse">
            {t.openingMenu}
          </p>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground/60 transition-opacity duration-300">
          {t.tapToEnter}
        </p>
      </div>
    </div>
  );
}
