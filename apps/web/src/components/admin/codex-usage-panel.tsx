"use client";

import { useEffect, useState } from "react";
import { Clock3, RefreshCcw, TriangleAlert } from "lucide-react";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { cn } from "@/lib/utils";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
  EnvironmentalImpactCodexUsageSource,
} from "@/lib/environmental-impact-estimator";

type CodexUsageAdminResponse = {
  status: "ok" | "error";
  triggeredBy?: string;
  version?: string;
  error?: string;
  details?: string;
  snapshot?: EnvironmentalImpactCodexUsageWeeklySnapshotRecord;
  aggregate?: EnvironmentalImpactCodexUsageMonthlyEstimate;
  latest?: EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null;
  snapshots?: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[];
};

type FormState = {
  weekStart: string;
  weekEnd: string;
  sessionCount: string;
  conversationCount: string;
  turnCount: string;
  toolCallCount: string;
  shellCommandCount: string;
  fileTouchCount: string;
  testRunCount: string;
  changedLineCount: string;
  activeMinutes: string;
  source: EnvironmentalImpactCodexUsageSource;
  notes: string;
};

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStart: toIsoDate(weekStart),
    weekEnd: toIsoDate(weekEnd),
  };
}

function formatKg(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 3,
  }).format(value)} kg CO2e proxy`;
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function CodexUsagePanel() {
  const [result, setResult] = useState<CodexUsageAdminResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => {
    const week = getCurrentWeekRange();
    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      sessionCount: "0",
      conversationCount: "0",
      turnCount: "0",
      toolCallCount: "0",
      shellCommandCount: "0",
      fileTouchCount: "0",
      testRunCount: "0",
      changedLineCount: "0",
      activeMinutes: "0",
      source: "manual",
      notes: "",
    };
  });

  useEffect(() => {
    setIsLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/admin/codex-usage?historyLimit=12", {
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json().catch(() => null)) as CodexUsageAdminResponse | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? `Erreur API (${response.status})`);
        }
        setResult(payload);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Chargement impossible.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const submit = () => {
    setIsSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/admin/codex-usage?historyLimit=12", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            weekStart: form.weekStart,
            weekEnd: form.weekEnd,
            sessionCount: parseNumber(form.sessionCount),
            conversationCount: parseNumber(form.conversationCount),
            turnCount: parseNumber(form.turnCount),
            toolCallCount: parseNumber(form.toolCallCount),
            shellCommandCount: parseNumber(form.shellCommandCount),
            fileTouchCount: parseNumber(form.fileTouchCount),
            testRunCount: parseNumber(form.testRunCount),
            changedLineCount: parseNumber(form.changedLineCount),
            activeMinutes: parseNumber(form.activeMinutes),
            source: form.source,
            notes: form.notes
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        });

        const payload = (await response.json().catch(() => null)) as CodexUsageAdminResponse | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? `Erreur API (${response.status})`);
        }

        setResult(payload);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const latestSnapshot = result?.latest ?? result?.snapshots?.[0] ?? null;
  const aggregate = result?.aggregate ?? null;
  const averageWeeklyKg = aggregate
    ? aggregate.estimatedKgCo2eProxy / Math.max(1, aggregate.windowWeeks)
    : null;

  return (
    <AdminPanelShell
      title="Journal Codex hebdomadaire"
      subtitle="Enregistre l'activité Codex / ChatGPT Plus semaine par semaine pour produire un historique CleanMyMap spécifique au projet."
      headerAction={
        <button
          type="button"
          onClick={submit}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <RefreshCcw size={12} className={cn(isSaving && "animate-spin")} />
          {isSaving ? "Enregistrement..." : "Enregistrer la semaine"}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Source
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Journal hebdomadaire manuel, importé ou reconstruit à partir de l'activité réelle du projet.
            </p>
          </article>
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Conversion
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Le calcul transforme sessions, conversations, actions outillées et temps actif en kg CO2e proxy.
            </p>
          </article>
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Historique
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Le calculateur lit ensuite les 4 dernières semaines pour produire l'équivalent mensuel.
            </p>
          </article>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
            <TriangleAlert className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-black">Erreur Codex</p>
              <p className="mt-1 text-xs leading-relaxed text-rose-100/80">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["weekStart", "Début semaine"],
            ["weekEnd", "Fin semaine"],
            ["sessionCount", "Sessions"],
            ["conversationCount", "Conversations"],
            ["turnCount", "Tours"],
            ["toolCallCount", "Actions outillées"],
            ["shellCommandCount", "Commandes shell"],
            ["fileTouchCount", "Fichiers touchés"],
            ["testRunCount", "Tests"],
            ["changedLineCount", "Lignes modifiées"],
            ["activeMinutes", "Minutes actives"],
          ].map(([key, label]) => {
            const fieldKey = key as keyof FormState;

            return (
              <label
              key={key}
              className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs font-semibold text-white/70"
            >
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                {label}
              </span>
              <input
                type={key.includes("Count") || key === "activeMinutes" ? "number" : "date"}
                min={key.includes("Count") || key === "activeMinutes" ? 0 : undefined}
                value={form[fieldKey]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [fieldKey]: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-white/20"
              />
              </label>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs font-semibold text-white/70">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              Source de la semaine
            </span>
            <select
              value={form.source}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  source: event.target.value as EnvironmentalImpactCodexUsageSource,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-white/20"
            >
              <option value="manual">Manual</option>
              <option value="imported">Imported</option>
              <option value="reconstructed">Reconstructed</option>
            </select>
          </label>
          <label className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs font-semibold text-white/70">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              Notes
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Une note par ligne"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-white/20"
            />
          </label>
        </div>

        {result ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
                  <Clock3 size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/60">
                    Dernière semaine enregistrée
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {latestSnapshot?.weekStart ?? "—"} → {latestSnapshot?.weekEnd ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Semaine
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {formatKg(latestSnapshot?.estimatedKgCo2eProxy ?? null)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Mensuel équivalent
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {formatKg(aggregate?.estimatedKgCo2eProxy ?? null)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Confiance
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {formatNumber(aggregate?.confidencePercent ?? null)}%
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-white/50">
                Déclenché par {result.triggeredBy ?? "admin-manual"} avec {result.snapshots?.length ?? 0} semaine(s) enregistrée(s).
              </p>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Dernière mise à jour
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {formatDate(result.snapshot?.generatedAt ?? latestSnapshot?.generatedAt ?? null)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/45">
                Source: {latestSnapshot?.source ?? "—"}.
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                  Moyenne hebdo
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {formatKg(averageWeeklyKg)}
                </p>
              </div>
            </article>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/45">
            Aucun journal Codex n&apos;a encore été enregistré. Le premier envoi crée une semaine pivot qui servira ensuite au calcul mensuel.
          </div>
        )}

        {result?.snapshots?.length ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                  Historique
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  Semaines Codex enregistrées
                </h3>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                {result.snapshots.length} semaine{result.snapshots.length > 1 ? "s" : ""}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {result.snapshots.slice(0, 6).map((snapshot) => (
                <article
                  key={`${snapshot.weekStart}-${snapshot.weekEnd}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    {snapshot.weekStart} → {snapshot.weekEnd}
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {formatKg(snapshot.estimatedKgCo2eProxy)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    Sessions {formatNumber(snapshot.sessionCount)}, conversations {formatNumber(snapshot.conversationCount)}, confiance {formatNumber(snapshot.confidencePercent)}%.
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/45">
            Chargement de l&apos;historique Codex...
          </div>
        ) : null}
      </div>
    </AdminPanelShell>
  );
}
