"use client";

import useSWR from "swr";
import { formatDateTimeShort } from "@/components/sections/rubriques/helpers";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";


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
        status?: string;
        service?: string;
        timestamp?: string;
      };
    },
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

  async function triggerRunbook(
    profile: "ops" | "admin" | "dev",
  ): Promise<void> {
    const payload = {
      profile,
      status: "pass" as const,
      durationSeconds:
        profile === "ops" ? 170 : profile === "admin" ? 240 : 210,
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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {fr ? "Sandbox de visualisation" : "Preview sandbox"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {fr
                ? "Espace de test pour découvrir la carte, vérifier les filtres et contrôler l&apos;état technique avant de lancer une action."
                : "Test space to explore the map, verify filters and check technical health before taking action."}
            </p>
          </div>
          <button
            onClick={() => void mutate()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {isValidating ? (fr ? "Actualisation..." : "Refreshing...") : fr ? "Recharger" : "Reload"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {fr ? "Santé" : "Health"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {isLoading
                ? fr
                  ? "Chargement..."
                  : "Loading..."
                : error
                  ? fr
                    ? "Indisponible"
                    : "Unavailable"
                  : (data?.status ?? "n/a")}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {fr ? "Service" : "Service"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {data?.service ?? "cleanmymap-web"}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {fr ? "Horodatage" : "Timestamp"}
            </p>
            <p className="mt-1 text-xs font-mono text-slate-700">
              {data?.timestamp ?? "-"}
            </p>
          </article>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {fr ? "Points d&apos;entrée rapides" : "Quick entry points"}
          </h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>
              <a
                className="font-semibold text-emerald-700 hover:text-emerald-800"
                href="/api/health"
                target="_blank"
                rel="noreferrer"
              >
                GET /api/health
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 hover:text-emerald-800"
                href="/api/actions?limit=5"
                target="_blank"
                rel="noreferrer"
              >
                GET /api/actions?limit=5
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 hover:text-emerald-800"
                href="/api/actions/map?days=7&limit=20"
                target="_blank"
                rel="noreferrer"
              >
                GET /api/actions/map?days=7&limit=20
              </a>
            </li>
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {fr ? "Runbook checks versionnés" : "Versioned runbook checks"}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            {fr
              ? `Version: ${runbook.data?.version ?? "n/a"} - objectif smoke tests < 5 min.`
              : `Version: ${runbook.data?.version ?? "n/a"} - smoke tests target < 5 min.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
            onClick={() => void triggerRunbook("ops")}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {fr ? "Lancer OPS" : "Run OPS"}
          </button>
            <button
              onClick={() => void triggerRunbook("admin")}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {fr ? "Lancer ADMIN" : "Run ADMIN"}
          </button>
            <button
              onClick={() => void triggerRunbook("dev")}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {fr ? "Lancer DEV" : "Run DEV"}
          </button>
          </div>
          <ul className="mt-2 space-y-2 text-xs text-slate-700">
            {(runbook.data?.checks ?? []).map((check) => (
              <li
                key={check.profile}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <p className="font-semibold uppercase">
                  {check.profile} - {check.status}
                </p>
                <p>
                  {fr ? "Durée" : "Duration"}: {check.durationSeconds}s -{" "}
                  {fr ? "Dernière exécution" : "Last run"}:{" "}
                  {check.lastRunAt
                    ? formatDateTimeShort(check.lastRunAt)
                    : fr
                      ? "jamais"
                      : "never"}
                </p>
                <p>{fr ? "Notes" : "Notes"}: {check.notes.join(", ")}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

    </div>
  );
}
