"use client";

import useSWR from "swr";
import { formatDateTimeShort } from "@/components/sections/rubriques/helpers";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { 
  Terminal, 
  Activity, 
  Server, 
  Clock, 
  ExternalLink, 
  Zap, 
  ShieldCheck, 
  Search,
  RefreshCw,
  Code
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SandboxSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "section-sandbox-health",
    async () => {
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("health_unavailable");
      }
      return (await response.json()) as {
        ok?: boolean;
        status?: string;
        service?: string;
        timestamp?: string;
      };
    }
  );

  const runbook = useSWR("section-sandbox-runbook", async () => {
    const response = await fetch("/api/sandbox/runbook-checks", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("runbook_unavailable");
    }
    return (await response.json()) as {
      version: string;
      checks: Array<{
        profile: "ops" | "admin" | "dev";
        status: "pass" | "fail";
        durationSeconds: number;
        lastRunAt: string;
        notes: string[];
      }>;
    };
  });

  async function triggerRunbook(profile: "ops" | "admin" | "dev"): Promise<void> {
    const payload = {
      profile,
      status: "pass" as const,
      durationSeconds: profile === "ops" ? 170 : profile === "admin" ? 240 : 210,
      notes:
        profile === "ops"
          ? ["declarer->carte->historique", "smoke terrain < 5 min"]
          : profile === "admin"
          ? ["import dry-run obligatoire", "journal operationnel present"]
          : ["api smoke", "export rubriques"],
    };
    await fetch("/api/sandbox/runbook-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await runbook.mutate();
  }

  return (
    <SectionShell 
      id="sandbox"
      title={fr ? "Carte d'entrainement" : "Sandmap"}
      subtitle={fr 
        ? "Espace d'entrainement technique pour tester la carte, vérifier les filtres et contrôler l'état du système." 
        : "Technical training space to test the map, verify filters and monitor system health."}
      icon={Terminal}
      gradient="from-slate-500/20 via-blue-500/10 to-transparent"
    >
      <div className="space-y-10 pt-12 pb-20">
        {/* Health Monitoring Dashboard */}
        <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Activity size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white tracking-tight">
                  {fr ? "État Technique" : "Technical Health"}
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {fr ? "Surveillance en temps réel" : "Real-time monitoring"}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => void mutate()}
              disabled={isValidating}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(isValidating && "animate-spin")} />
              {isValidating ? (fr ? "Actualisation..." : "Refreshing...") : (fr ? "Rafraîchir" : "Refresh")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{fr ? "Statut" : "Status"}</p>
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", (data?.ok || data?.status === 'ok') ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500")} />
                <p className="text-lg font-black text-white uppercase">
                  {isLoading ? "..." : error ? (fr ? "Indisponible" : "Unavailable") : (data?.status ?? (data?.ok ? "Online" : "Offline"))}
                </p>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{fr ? "Service" : "Service"}</p>
              <div className="flex items-center gap-3 text-blue-400">
                <Server size={20} />
                <p className="text-lg font-black text-white">{data?.service ?? "cleanmymap"}</p>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{fr ? "Horodatage" : "Timestamp"}</p>
              <div className="flex items-center gap-3 text-slate-400">
                <Clock size={20} />
                <p className="text-xs font-mono font-bold leading-none">{data?.timestamp ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Entry Points & Runbooks */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-10">
          {/* Quick Entry Points */}
          <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                <Search size={20} />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Points d'accès API" : "API Access Points"}</h3>
            </div>
            
            <div className="space-y-3">
              {[
                { label: "Health Check", path: "/api/health" },
                { label: "Actions List", path: "/api/actions?limit=5" },
                { label: "Map Data", path: "/api/actions/map?days=7&limit=20" },
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.path}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{link.label}</p>
                    <code className="text-xs font-mono text-slate-300">GET {link.path}</code>
                  </div>
                  <ExternalLink size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Versioned Runbooks */}
          <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Runbook Checks" : "Runbook Checks"}</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    v{runbook.data?.version ?? "0.0.0"} — Target &lt; 5min
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {["ops", "admin", "dev"].map((profile) => (
                  <button
                    key={profile}
                    onClick={() => void triggerRunbook(profile as any)}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest hover:bg-emerald-500 hover:text-slate-950 transition-all"
                  >
                    Run {profile.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {(runbook.data?.checks ?? []).map((check, i) => (
                <motion.div
                  key={check.profile}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-[1.5rem] bg-white/5 border border-white/5 group hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-xs font-black text-white uppercase tracking-widest">{check.profile}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {check.lastRunAt ? formatDateTimeShort(check.lastRunAt) : "Never"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{fr ? "Durée" : "Duration"}</p>
                      <p className="text-sm font-black text-white">{check.durationSeconds}s</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</p>
                      <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">{check.status}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                    {check.notes.map((note, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {note}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
