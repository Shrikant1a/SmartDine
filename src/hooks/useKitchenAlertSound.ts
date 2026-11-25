"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Web Audio API kitchen bell/chime controller.
 * AudioContext is only created and resumed upon explicit staff interaction
 * ("Enable Sound"), respecting browser autoplay restrictions.
 */
export function useKitchenAlertSound() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  const playChimeWithContext = useCallback((ctx: AudioContext) => {
    const now = ctx.currentTime;
    const tones = [880, 1174.66]; // A5 -> D6 crisp kitchen chime

    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.38);
    });
  }, []);

  const toggleSound = useCallback(async () => {
    if (soundEnabled) {
      setSoundEnabled(false);
      return false;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!ctxRef.current) {
        ctxRef.current = new AudioCtx();
      }
      if (ctxRef.current.state === "suspended") {
        await ctxRef.current.resume();
      }
      setSoundEnabled(true);
      playChimeWithContext(ctxRef.current);
      return true;
    } catch {
      return false;
    }
  }, [soundEnabled, playChimeWithContext]);

  const playNewOrderChime = useCallback(() => {
    if (!soundEnabled || !ctxRef.current) return;
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
    playChimeWithContext(ctxRef.current);
  }, [soundEnabled, playChimeWithContext]);

  return { soundEnabled, toggleSound, playNewOrderChime };
}
