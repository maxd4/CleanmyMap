"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Activity, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
import type { DashboardTodayState } from "@/lib/dashboard/today";
import { cn } from "@/lib/utils";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

type DashboardTodayPanelProps = {
  state: DashboardTodayState;
};

function tileAccent(label: string) {
  if (label.includes("traiter") || label.includes("review")) {
    return { icon: "text-amber-200 bg-amber-500/20 border-amber-400/30", bar: "bg-amber-400" };
  }
  if (label.includes("action")) {
    return { icon: "text-orange-200 bg-orange-500/20 border-orange-400/30", bar: "bg-orange-400" };
  }
  return { icon: "text-amber-100 bg-amber-400/18 border-amber-300/28", bar: "bg-amber-300" };
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
      <div data-gsap-reveal className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-100/78">
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
          <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-[rgba(69,26,3,0.45)] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-50">
              Sync {state.syncedAtLabel}
            </span>
          </div>
        )}
      </div>

      {state.kind === "ready" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[state.latestActivity, state.validation, state.nextAction].map((tile) => {
            const accent = tileAccent(tile.label);
            return (
              <article
                key={tile.label}
                data-gsap-reveal
                className="group relative overflow-hidden rounded-3xl border border-amber-200/12 transition-all duration-300 hover:-translate-y-1 hover:border-amber-200/24 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)]"
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(145deg,rgba(44,28,15,0.84)_0%,rgba(92,45,12,0.86)_54%,rgba(245,158,11,0.26)_100%)] transition-colors duration-300 group-hover:bg-[linear-gradient(145deg,rgba(53,33,16,0.88)_0%,rgba(124,53,15,0.90)_54%,rgba(251,146,60,0.34)_100%)]" />
                <div className={cn("absolute inset-x-0 top-0 h-[3px] z-10", accent.bar)} />

                <div className="relative z-10 p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className={cn("flex items-center justify-center rounded-xl border p-2.5", accent.icon)}>
                      {getTileIcon(tile.label)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-50/60">
                      {tile.label}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xl font-black leading-snug tracking-tight text-white">
                      {tile.title}
                    </p>
                    <p className="line-clamp-3 text-sm leading-relaxed text-amber-50/82">
                      {tile.detail}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-amber-200/12 pt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-50/46">
                      {tile.meta}
                    </span>
                    {(tile.label.includes("Next action") || tile.label.includes("Prochaine action")) && (
                      <Link
                        href={state.nextAction.href}
                        className="group/link flex items-center gap-1.5 text-[11px] font-bold text-amber-100 transition-colors hover:text-white"
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
        <SystemStateLayout
          variant={state.kind === "error" ? "error" : "empty"}
          className="max-w-none"
        >
          <SystemStateIcon variant={state.kind === "error" ? "error" : "empty"}>
            <AlertCircle size={22} />
          </SystemStateIcon>
          <SystemStateMeta
            variant={state.kind === "error" ? "error" : "empty"}
            label={state.kind === "error" ? "Interruption de flux" : "Fenêtre vide"}
          >
            {state.kind === "error"
              ? "Nos services tentent de rétablir la connexion. Les autres modules restent opérationnels."
              : "C'est le moment idéal pour planifier une nouvelle intervention ou valider les rapports en attente."}
          </SystemStateMeta>
          <SystemStateTitle variant={state.kind === "error" ? "error" : "empty"}>
            {state.kind === "error" ? state.message : "Aucune activité récente"}
          </SystemStateTitle>
          <SystemStateDescription variant={state.kind === "error" ? "error" : "empty"}>
            {state.kind === "error"
              ? "Le cockpit ne peut pas charger sa synthèse pour le moment."
              : "Aucune activité récente n&apos;a été trouvée sur cette période."}
          </SystemStateDescription>
          <SystemStateAction>
            {state.kind === "error" ? <SystemStateRetryButton /> : null}
            <CmmButton href={state.nextAction.href} tone="secondary">
              {state.nextAction.title}
            </CmmButton>
          </SystemStateAction>
        </SystemStateLayout>
      )}
    </section>
  );
}
