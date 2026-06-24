"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { guideChecklistStorage } from "@/lib/storage/ui-state-storage";
import { cn } from "@/lib/utils";

const CHECKLIST_ITEMS = [
  {
    id: "phone",
    fr: "Charger son téléphone",
    en: "Charge your phone",
  },
  {
    id: "gear",
    fr: "Prévoir gants, sacs, pinces, eau",
    en: "Bring gloves, bags, grabbers and water",
  },
  {
    id: "danger",
    fr: "Éviter les déchets dangereux",
    en: "Avoid hazardous waste",
  },
  {
    id: "photos",
    fr: "Prendre quelques photos utiles",
    en: "Take a few useful photos",
  },
  {
    id: "report",
    fr: "Renseigner poids, durée, bénévoles, types de déchets",
    en: "Record weight, duration, volunteers and waste types",
  },
  {
    id: "validate",
    fr: "Valider le bilan après l’action",
    en: "Validate the post-action report",
  },
] as const;

export function GuideOperationalPanel() {
  const { isLoaded, user } = useUser();
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(
      CHECKLIST_ITEMS.map((item) => [item.id, false]),
    ) as Record<string, boolean>;

    if (typeof window === "undefined") {
      return defaults;
    }

    return { ...defaults, ...(guideChecklistStorage.read() ?? {}) };
  });
  const [serverReadyForUser, setServerReadyForUser] = useState(false);
  const serverReady = !isLoaded || !user || serverReadyForUser;

  useEffect(() => {
    guideChecklistStorage.write(checks);
  }, [checks]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      return;
    }

    let active = true;
    void fetch("/api/users/checklist-progress?checklistId=guide-main", {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          entry?: { checks?: Record<string, boolean> } | null;
        };
        if (active && payload.entry?.checks) {
          setChecks((prev) => ({ ...prev, ...payload.entry?.checks }));
        }
      })
      .finally(() => {
        if (active) {
          setServerReadyForUser(true);
        }
      });

    return () => {
      active = false;
    };
  }, [isLoaded, user]);

  useEffect(() => {
    if (!serverReady || !user) {
      return;
    }
    void fetch("/api/users/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistId: "guide-main", checks }),
    }).catch(() => undefined);
  }, [checks, serverReady, user]);

  const progress = useMemo(() => {
    const values = Object.values(checks);
    const done = values.filter(Boolean).length;
    return values.length > 0 ? Math.round((done / values.length) * 100) : 0;
  }, [checks]);

  function toggleCheck(key: string): void {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="grid grid-cols-1 gap-8 pt-8">
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,251,240,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-8 shadow-[0_28px_80px_rgba(15,23,42,0.08)] lg:p-10"
      >
        <div className="pointer-events-none absolute -right-10 top-0 p-20 opacity-10">
          <Trophy size={300} className="text-emerald-500" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                <ShieldCheck size={14} />
                {fr ? "Checklist opérationnelle" : "Operational checklist"}
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                {fr ? "Avant / pendant / après" : "Before / during / after"}
              </h3>
              <p className="max-w-2xl text-sm font-medium text-slate-600">
                {fr
                  ? "Suivez cette séquence courte pour garder une donnée exploitable."
                  : "Follow this short sequence to keep the data usable."}
              </p>
            </div>

            <div className="text-right">
              <p className="text-3xl font-black tracking-tighter text-emerald-700">
                {progress}%
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {fr ? "Complété" : "Completed"}
              </p>
            </div>
          </div>

          <div className="relative h-3 w-full overflow-hidden rounded-full border border-emerald-100 bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            />
          </div>
        </div>

        <div className="relative z-10 mt-8 grid gap-4">
          {CHECKLIST_ITEMS.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <CmmButton
                onClick={() => toggleCheck(item.id)}
                tone={checks[item.id] ? "primary" : "tertiary"}
                variant="pill"
                className={cn(
                  "flex items-center gap-5 p-5 rounded-2xl border transition-all text-left group w-full",
                  checks[item.id]
                    ? "bg-emerald-500/10 border-emerald-500/20 shadow-lg"
                    : "bg-white/5 border-white/5 hover:border-white/10",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0",
                    checks[item.id]
                      ? "bg-emerald-500 text-slate-950 scale-110"
                      : "bg-slate-950/40 border border-white/10 text-slate-600",
                  )}
                >
                  {checks[item.id] ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-black tracking-tight transition-colors",
                    checks[item.id]
                      ? "text-white"
                      : "text-slate-300 group-hover:text-slate-200",
                  )}
                >
                  {fr ? item.fr : item.en}
                </span>
              </CmmButton>
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 mt-8 flex items-center gap-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-5">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <Sparkles size={20} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-slate-500">
            {fr
              ? "Checklist rapide, sans surcharge, pour standardiser la remontée de terrain."
              : "Short checklist, no clutter, to standardize field reporting."}
          </p>
        </div>

        <div className="relative z-10 pt-2">
          <CmmButtonGroup className="flex flex-col sm:flex-row gap-3">
            <CmmButton
              href="/sections/route"
              tone="primary"
              className="h-14 px-6 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/20"
            >
              {fr ? "Planifier une action" : "Plan an action"}
            </CmmButton>
            <CmmButton
              href="/sections/weather"
              tone="secondary"
              variant="pill"
              className="h-14 px-6 font-black uppercase tracking-widest text-xs"
            >
              {fr ? "Ouvrir la fiche terrain" : "Open field sheet"}
            </CmmButton>
          </CmmButtonGroup>
        </div>
      </motion.article>
    </div>
  );
}

export function GuideSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <SectionShell
      id="guide"
      title={fr ? "Préparation terrain" : "Field preparation"}
      subtitle={
        fr
          ? "Avant / pendant / après"
          : "Before / during / after"
      }
      icon={ShieldCheck}
      gradient="from-emerald-500/20 via-blue-500/10 to-transparent"
    >
      <GuideOperationalPanel />
    </SectionShell>
  );
}
