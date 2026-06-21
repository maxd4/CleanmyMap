"use client";

import { memo, useCallback } from "react";
import { BellRing, PartyPopper, Sparkles, Volume2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { announceGamificationGain } from "@/lib/gamification/announcements";

export type LightCelebrationPreview = {
  title: string;
  message: string;
  tone: "generic";
  icon: string;
  durationMs: number;
  confetti: boolean;
  sound: boolean;
  source: string;
};

export function buildLightCelebrationPreview(locale: string): LightCelebrationPreview {
  const fr = locale === "fr";
  return {
    title: fr ? "Palier atteint" : "Threshold reached",
    message: fr
      ? "Aperçu discret d’une célébration légère: toast, son bref et confetti léger."
      : "A discreet preview of a light celebration: toast, short sound and light confetti.",
    tone: "generic",
    icon: "✨",
    durationMs: 2800,
    confetti: true,
    sound: true,
    source: "light-celebrations-panel",
  };
}

type LightCelebrationsPanelProps = {
  locale: string;
};

export const LightCelebrationsPanel = memo(function LightCelebrationsPanel({
  locale,
}: LightCelebrationsPanelProps) {
  const fr = locale === "fr";
  const preview = buildLightCelebrationPreview(locale);

  const handlePreview = useCallback(() => {
    announceGamificationGain(preview);
  }, [preview]);

  return (
    <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
            {fr ? "Célébrations légères" : "Light celebrations"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {fr
              ? "Toast discret, confetti léger et son bref quand un palier tombe."
              : "A discreet toast, light confetti and a short sound when a milestone lands."}
          </p>
        </div>
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
          {fr ? "Actif" : "Active"}
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.03] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
            <Sparkles size={12} />
            {fr ? "Règle simple" : "Simple rule"}
          </div>
          <p className="mt-3 text-base font-semibold leading-relaxed text-white">
            {fr
              ? "Chaque palier important peut déclencher un retour visuel et sonore très court, sans interrompre la lecture."
              : "Each important milestone can trigger a very short visual and sound cue without interrupting reading."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300">
              <BellRing size={12} className="text-red-300" />
              {fr ? "Toast discret" : "Discreet toast"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300">
              <PartyPopper size={12} className="text-red-300" />
              {fr ? "Confetti léger" : "Light confetti"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300">
              <Volume2 size={12} className="text-red-300" />
              {fr ? "Son bref" : "Short sound"}
            </span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-slate-950/50 p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            {fr ? "Aperçu contrôlé" : "Controlled preview"}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
            {fr
              ? "Le bouton ci-dessous déclenche la même mécanique que les paliers réels, mais avec un message de démonstration."
              : "The button below triggers the same mechanism as real milestones, but with a demo message."}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <CmmButton
              type="button"
              onClick={handlePreview}
              tone="primary"
              variant="pill"
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em]"
            >
              {fr ? "Tester l’aperçu" : "Test preview"}
            </CmmButton>
            <p className="text-[10px] font-semibold text-slate-500">
              {fr
                ? "Aucune donnée n’est modifiée."
                : "No data is modified."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});
