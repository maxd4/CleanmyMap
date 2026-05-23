"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Activity, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import type { DashboardTodayState } from "@/lib/dashboard/today";
import { cn } from "@/lib/utils";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

type DashboardTodayPanelProps = {
  state: DashboardTodayState;
};

function tileAccent(label: string) {
  if (label.includes("traiter") || label.includes("review"))
    return { icon: "text-amber-300 bg-amber-400/20 border-amber-400/30", bar: "bg-amber-400" };
  if (label.includes("action"))
    return { icon: "text-emerald-300 bg-emerald-400/20 border-emerald-400/30", bar: "bg-emerald-400" };
  return { icon: "text-sky-300 bg-sky-400/20 border-sky-400/30", bar: "bg-sky-400" };
}

function getTileIcon(label: string) {
  if (label.includes("traiter") || label.includes("review")) return <ShieldCheck size={16} />;
  if (label.includes("action")) return <Activity size={16} />;
  return <Clock size={16} />;
}

export function DashboardTodayPanel({ state }: DashboardTodayPanelProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  useGsapReveal(rootRef, {
    selector: "[data-gsap-reveal]",
    start: "top 84%",
    stagger: 0.07,
    duration: 0.55,
    y: 16,
  });

  return (
    <section ref={rootRef} className="mt-8 space-y-5">

      {/* Header */}
      <div data-gsap-reveal className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
            {state.kind === "error" ? "Diagnostic" : "Plan de journée"}
          </p>
          <h2 className="mt-1 text-[clamp(2.5rem,5vw,4rem)] font-black leading-[0.93] tracking-[-0.04em] text-white">
            {state.kind === "error"
              ? "Synthèse indisponible"
              : state.kind === "empty"
                ? "Calme plat"
                : "Aujourd'hui"}
          </h2>
        </div>
        {"syncedAtLabel" in state && (
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">
              Sync {state.syncedAtLabel}
            </span>
          </div>
        )}
      </div>

      {/* Tiles ready */}
      {state.kind === "ready" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[state.latestActivity, state.validation, state.nextAction].map((tile) => {
            const accent = tileAccent(tile.label);
            return (
              <article
                key={tile.label}
                data-gsap-reveal
                className="group relative overflow-hidden rounded-3xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.4)]"
              >
                {/* Fond sombre isolé */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-black/30 transition-colors duration-300 group-hover:bg-black/35" />
                {/* Barre colorée top */}
                <div className={cn("absolute inset-x-0 top-0 h-[3px] z-10", accent.bar)} />

                <div className="relative z-10 p-6">
                  {/* Header tile */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={cn("flex items-center justify-center rounded-xl border p-2.5", accent.icon)}>
                      {getTileIcon(tile.label)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      {tile.label}
                    </p>
                  </div>

                  {/* Contenu */}
                  <div className="space-y-2">
                    <p className="text-xl font-black tracking-tight text-white leading-snug">
                      {tile.title}
                    </p>
                    <p className="text-sm text-white/75 leading-relaxed line-clamp-3">
                      {tile.detail}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
                      {tile.meta}
                    </span>
                    {(tile.label.includes("Next action") || tile.label.includes("Prochaine action")) && (
                      <Link
                        href={state.nextAction.href}
                        className="group/link flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 transition-colors"
                      >
                        Exécuter
                        <ArrowRight size={11} className="transition-transform group-hover/link:translate-x-0.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div data-gsap-reveal
          className="relative overflow-hidden rounded-3xl border border-white/10"
        >
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-black/30" />
          <div className="relative z-10 p-7">
            <div className="flex items-start gap-5">
              <div className="shrink-0 rounded-2xl bg-white/10 p-3 text-white">
                <AlertCircle size={22} />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    {state.kind === "error" ? "Interruption de flux" : "Fenêtre vide"}
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    {state.kind === "error" ? state.message : "Aucune activité récente"}
                  </h3>
                  <p className="mt-1.5 text-sm text-white/75 leading-relaxed max-w-xl">
                    {state.kind === "error"
                      ? "Nos services tentent de rétablir la connexion. Les autres modules restent opérationnels."
                      : "C'est le moment idéal pour planifier une nouvelle intervention ou valider les rapports en attente."}
                  </p>
                </div>
                <Link
                  href={state.nextAction.href}
                  className="group/cta inline-flex items-center gap-2.5 rounded-2xl bg-amber-300 px-5 py-3 text-[13px] font-black text-amber-950 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-0.5 hover:bg-amber-200"
                >
                  {state.nextAction.title}
                  <ArrowRight size={14} className="transition-transform group-hover/cta:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
