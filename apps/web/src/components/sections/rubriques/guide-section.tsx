"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { guideChecklistStorage } from "@/lib/storage/ui-state-storage";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { BookOpen, CheckCircle2, ChevronRight, LayoutList, PlayCircle, Sparkles, Trophy, ShieldCheck, Zap, ArrowRight, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function GuideSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [resourceVariant, setResourceVariant] = useState<"solo" | "team" | "school" | "weather">("team");
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const defaults = {
      briefing: false,
      declaration: false,
      tracing: false,
      moderation: false,
      export: false,
    };
    if (typeof window === "undefined") {
      return defaults;
    }
    return { ...defaults, ...(guideChecklistStorage.read() ?? {}) };
  });
  const [serverReady, setServerReady] = useState<boolean>(false);

  useEffect(() => {
    guideChecklistStorage.write(checks);
  }, [checks]);

  useEffect(() => {
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
          setServerReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!serverReady) {
      return;
    }
    void fetch("/api/users/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistId: "guide-main", checks }),
    }).catch(() => undefined);
  }, [checks, serverReady]);

  const progress = useMemo(() => {
    const values = Object.values(checks);
    const done = values.filter(Boolean).length;
    return values.length > 0 ? Math.round((done / values.length) * 100) : 0;
  }, [checks]);

  function toggleCheck(key: string): void {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const sop = useMemo(() => {
    if (resourceVariant === "solo") {
      return [
        {
          phase: fr ? "Avant sortie" : "Before outing",
          content: fr
            ? "Brief sécurité, météo et zone ciblée validés."
            : "Safety, weather and target zone briefing validated.",
        },
        {
          phase: fr ? "Pendant collecte" : "During collection",
          content: fr
            ? "Déclencher mode déclaration rapide, capturer 1 preuve géo minimale."
            : "Trigger quick-declare mode, capture 1 minimal geo proof.",
        },
        {
          phase: fr ? "Après action" : "After action",
          content: fr
            ? "Compléter les champs manquants et publier le récap 5 lignes."
            : "Fill missing fields and publish a 5-line recap.",
        },
        {
          phase: fr ? "Qualité / export" : "Quality / export",
          content: fr
            ? "Vérifier score qualité et exporter CSV pour suivi local."
            : "Check quality score and export CSV for local follow-up.",
        },
      ];
    }
    if (resourceVariant === "school") {
      return [
        {
          phase: fr ? "Avant sortie" : "Before outing",
          content: fr
            ? "Répartition des rôles élèves/adultes + rappel EPI obligatoire."
            : "Split roles between students/adults + mandatory PPE reminder.",
        },
        {
          phase: fr ? "Pendant collecte" : "During collection",
          content: fr
            ? "Progression par binômes, pauses cadencées, zone délimitée."
            : "Move in pairs, paced breaks, defined area.",
        },
        {
          phase: fr ? "Après action" : "After action",
          content: fr
            ? "Débrief classe + no-show + incidents sécurité."
            : "Class debrief + no-show + safety incidents.",
        },
        {
          phase: fr ? "Qualité / export" : "Quality / export",
          content: fr
            ? "Exporter bilan pédagogique + géocouverture + volumes triés."
            : "Export pedagogical summary + geo coverage + sorted volumes.",
        },
      ];
    }
    if (resourceVariant === "weather") {
      return [
        {
          phase: fr ? "Avant sortie" : "Before outing",
          content: fr
            ? "Confirmer niveau risque météo et équipements EPI renforcés."
            : "Confirm weather risk level and reinforced PPE.",
        },
        {
          phase: fr ? "Pendant collecte" : "During collection",
          content: fr
            ? "Limiter durée de rotation, pauses imposées, binômes obligatoires."
            : "Limit rotation time, enforced breaks, mandatory pairs.",
        },
        {
          phase: fr ? "Après action" : "After action",
          content: fr
            ? "Tracer contraintes terrain subies (pluie, vent, chaleur, froid)."
            : "Record weather-related constraints (rain, wind, heat, cold).",
        },
        {
          phase: fr ? "Qualité / export" : "Quality / export",
          content: fr
            ? "Tagger l'action météo-défavorable pour lecture KPI robuste."
            : "Tag the weather-disrupted action for robust KPI reading.",
        },
      ];
    }
    return [
      {
        phase: fr ? "Avant sortie" : "Before outing",
        content: fr
          ? "Assignation des rôles équipe, vérification kit, rappel sécurité."
          : "Assign team roles, verify kit, safety reminder.",
      },
      {
        phase: fr ? "Pendant collecte" : "During collection",
        content: fr
          ? "Déclaration rapide sur mobile + trace/polygone par zone."
          : "Quick mobile declaration + trace/polygon per area.",
      },
      {
        phase: fr ? "Après action" : "After action",
        content: fr
          ? "Consolidation des volumes, contrôle cohérence et relance corrections."
          : "Consolidate volumes, check consistency, chase corrections.",
      },
      {
        phase: fr ? "Qualité / export" : "Quality / export",
        content: fr
          ? "Validation score qualité et export partenaire/collectivité."
          : "Validate quality score and export partner/local-authority report.",
      },
    ];
  }, [fr, resourceVariant]);

  return (
    <SectionShell
      id="guide"
      title={fr ? "Mode Opératoire" : "Operating Procedures"}
      subtitle={fr 
        ? "Guide pratique et protocoles terrain pour une collecte de données fiable et sécurisée."
        : "Practical guide and field protocols for reliable and secure data collection."}
      icon={BookOpen}
      gradient="from-emerald-500/20 via-blue-500/10 to-transparent"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-10 pt-8 items-start">
        {/* Left: Resource Library */}
        <motion.article 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl space-y-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                   <Settings2 size={20} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                   {fr ? "Configuration" : "Setup"}
                </h3>
             </div>
             <div className="relative group">
                <select
                  value={resourceVariant}
                  onChange={(event) => setResourceVariant(event.target.value as any)}
                  className="appearance-none bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer pr-10"
                >
                  <option value="solo">Solo</option>
                  <option value="team">{fr ? "Équipe" : "Team"}</option>
                  <option value="school">{fr ? "Scolaire" : "School"}</option>
                  <option value="weather">{fr ? "Météo" : "Weather"}</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" />
             </div>
          </div>

          <div className="space-y-4">
             {sop.map((step, idx) => (
               <motion.div
                 key={step.phase}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.05 }}
                 className="p-5 rounded-2xl border border-white/5 bg-white/5 group hover:bg-white/10 transition-all"
               >
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">
                     {step.phase}
                  </p>
                  <p className="text-sm font-bold text-slate-300 leading-relaxed">
                     {step.content}
                  </p>
               </motion.div>
             ))}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
             <Link href="/actions/new" className="flex items-center justify-between p-4 rounded-xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                {fr ? "Déclarer une action" : "Declare an action"}
                <ArrowRight size={16} />
             </Link>
             <div className="grid grid-cols-2 gap-3">
                <Link href="/actions/history" className="flex items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all">
                   {fr ? "Fix Qualité" : "Fix Quality"}
                </Link>
                <Link href="/reports" className="flex items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all">
                   {fr ? "Exporter" : "Export"}
                </Link>
             </div>
          </div>
        </motion.article>

        {/* Right: Interactive Checklist */}
        <motion.article 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="rounded-[3rem] border border-white/5 bg-slate-950/20 backdrop-blur-3xl p-10 shadow-2xl space-y-10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
             <Trophy size={300} className="text-emerald-400" />
          </div>

          <div className="relative z-10 space-y-6">
             <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black text-white tracking-tight">
                      {fr ? "Playbook Bénévole" : "Volunteer Playbook"}
                   </h3>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      {fr ? "Parcours de Certification" : "Certification Path"}
                   </p>
                </div>
                <div className="text-right">
                   <p className="text-3xl font-black text-emerald-400 tracking-tighter">
                      {progress}%
                   </p>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {fr ? "Complété" : "Completed"}
                   </p>
                </div>
             </div>

             <div className="relative h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-blue-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                />
             </div>
          </div>

          <div className="relative z-10 grid gap-4">
             {[
               { id: "briefing", label: fr ? "Briefing équipe, météo et sécurité validés" : "Team, weather and safety briefing validated" },
               { id: "declaration", label: fr ? "Déclaration créée avec lieu, date, quantités" : "Declaration created with place, date and quantities" },
               { id: "tracing", label: fr ? "Trace ou polygone capturés pour la zone" : "Trace or polygon captured for the area" },
               { id: "moderation", label: fr ? "Modération suivie pour fiabiliser la donnée" : "Moderation followed to make data reliable" },
               { id: "export", label: fr ? "Export CSV/JSON réalisé pour exploitation" : "CSV/JSON export produced for use" },
             ].map((check, idx) => (
               <motion.button
                 key={check.id}
                 onClick={() => toggleCheck(check.id)}
                 initial={{ opacity: 0, y: 10 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.1 }}
                 className={cn(
                   "flex items-center gap-6 p-6 rounded-2xl border transition-all text-left group",
                   checks[check.id] 
                    ? "bg-emerald-500/10 border-emerald-500/20 shadow-lg" 
                    : "bg-white/5 border-white/5 hover:border-white/10"
                 )}
               >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500",
                    checks[check.id] ? "bg-emerald-500 text-slate-950 scale-110" : "bg-slate-950/40 border border-white/10 text-slate-600"
                  )}>
                     {checks[check.id] ? <CheckCircle2 size={18} /> : <div className="w-2 h-2 rounded-full bg-slate-800" />}
                  </div>
                  <span className={cn(
                    "text-sm font-black tracking-tight transition-colors",
                    checks[check.id] ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  )}>
                     {check.label}
                  </span>
               </motion.button>
             ))}
          </div>

          <div className="relative z-10 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-6">
             <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Sparkles size={20} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                {fr 
                  ? "Complétez le playbook pour débloquer votre certificat d'impact et rejoindre les contributeurs certifiés."
                  : "Complete the playbook to unlock your impact certificate and join certified contributors."}
             </p>
          </div>
        </motion.article>
      </div>
    </SectionShell>
  );
}
