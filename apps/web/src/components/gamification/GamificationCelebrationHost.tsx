"use client";

import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import GamificationToast from "./GamificationToast";
import {
  GAMIFICATION_CELEBRATION_EVENT,
  type GamificationCelebrationPayload,
  type GamificationCelebrationTone,
} from "@/lib/gamification/celebration";

type CelebrationState = GamificationCelebrationPayload & {
  id: number;
};

const CONFETTI_COLORS: Record<GamificationCelebrationTone, string[]> = {
  explorer: ["#f59e0b", "#fbbf24", "#fef3c7", "#ffffff"],
  forms: ["#10b981", "#34d399", "#d1fae5", "#ffffff"],
  "clean-zones": ["#0ea5e9", "#22d3ee", "#cffafe", "#ffffff"],
  actions: ["#8b5cf6", "#34d399", "#fef3c7", "#ffffff"],
  generic: ["#0b73ff", "#7dd3fc", "#ffffff"],
};

function playCelebrationTone(tone: GamificationCelebrationTone) {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextCtor =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  try {
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const secondOscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const frequencies: Record<GamificationCelebrationTone, [number, number]> = {
      explorer: [784, 988],
      forms: [659, 880],
      "clean-zones": [698, 932],
      actions: [587, 784],
      generic: [659, 830],
    };

    const [firstFrequency, secondFrequency] = frequencies[tone];
    oscillator.type = "sine";
    secondOscillator.type = "sine";
    oscillator.frequency.value = firstFrequency;
    secondOscillator.frequency.value = secondFrequency;

    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.24);

    oscillator.connect(gain);
    secondOscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    secondOscillator.start(audioContext.currentTime + 0.04);
    oscillator.stop(audioContext.currentTime + 0.18);
    secondOscillator.stop(audioContext.currentTime + 0.26);

    window.setTimeout(() => {
      void audioContext.close().catch(() => {});
    }, 400);
  } catch {
    // Aucun son si la politique navigateur bloque l'audio.
  }
}

function fireConfetti(tone: GamificationCelebrationTone) {
  if (typeof window === "undefined") {
    return;
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reducedMotion) {
    return;
  }

  const colors = CONFETTI_COLORS[tone];
  const burst = {
    particleCount: 16,
    spread: 38,
    startVelocity: 18,
    gravity: 0.78,
    ticks: 80,
    scalar: 0.72,
    zIndex: 120,
    disableForReducedMotion: true,
    colors,
  } as const;

  confetti({
    ...burst,
    origin: { x: 0.88, y: 0.88 },
  });
  confetti({
    ...burst,
    particleCount: 10,
    spread: 26,
    origin: { x: 0.78, y: 0.82 },
  });
}

export function GamificationCelebrationHost() {
  const [toast, setToast] = useState<CelebrationState | null>(null);
  const soundPlayedRef = useRef<number | null>(null);
  const recentKeysRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const handleCelebration = (event: Event) => {
      const customEvent = event as CustomEvent<GamificationCelebrationPayload>;
      const payload = customEvent.detail;
      const now = Date.now();
      for (const [key, timestamp] of recentKeysRef.current.entries()) {
        if (now - timestamp > 2 * 60 * 1000) {
          recentKeysRef.current.delete(key);
        }
      }

      if (payload.dedupeKey && recentKeysRef.current.has(payload.dedupeKey)) {
        return;
      }

      if (payload.dedupeKey) {
        recentKeysRef.current.set(payload.dedupeKey, now);
      }

      setToast({
        id: Date.now(),
        title: payload.title,
        message: payload.message,
        tone: payload.tone ?? "generic",
        icon: payload.icon,
        durationMs: payload.durationMs,
        confetti: payload.confetti,
        sound: payload.sound,
        source: payload.source,
      });
    };

    window.addEventListener(GAMIFICATION_CELEBRATION_EVENT, handleCelebration);
    return () => {
      window.removeEventListener(GAMIFICATION_CELEBRATION_EVENT, handleCelebration);
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const shouldPlaySound = toast.sound !== false && soundPlayedRef.current !== toast.id;
    if (shouldPlaySound) {
      soundPlayedRef.current = toast.id;
      playCelebrationTone(toast.tone ?? "generic");
    }

    if (toast.confetti !== false) {
      fireConfetti(toast.tone ?? "generic");
    }

    const timeout = window.setTimeout(
      () => setToast(null),
      toast.durationMs ?? 4200,
    );

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const renderedToast = toast;

  if (!renderedToast) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={renderedToast.id}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", damping: 24, stiffness: 320 }}
        className="fixed bottom-4 right-4 z-[95] w-[min(24rem,calc(100vw-2rem))]"
      >
        <GamificationToast
          title={renderedToast.title}
          message={renderedToast.message}
          icon={renderedToast.icon}
          tone={renderedToast.tone}
          onClose={() => setToast(null)}
        />
      </motion.div>
    </AnimatePresence>
  );
}
