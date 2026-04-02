"use client";

import useSWR from "swr";
import { serviceLevelLabel, summarizeUptime, type ServicesPayload, type UptimePayload } from "@/lib/dashboard/status";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Erreur API (${response.status}) sur ${url}`);
  }
  return (await response.json()) as T;
};

export function SystemStatusPanel() {
  const uptime = useSWR<UptimePayload>("/api/uptime", fetcher, { revalidateOnFocus: false });
  const services = useSWR<ServicesPayload>("/api/services", fetcher, { revalidateOnFocus: false });

  const isLoading = uptime.isLoading || services.isLoading;
  const isRefreshing = uptime.isValidating || services.isValidating;
  const hasError = Boolean(uptime.error || services.error);

  const uptimeSummary = uptime.data ? summarizeUptime(uptime.data) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">État des intégrations</h2>
          <p className="mt-1 text-sm text-slate-600">Synthèse temps réel des endpoints de supervision (`/api/uptime`, `/api/services`).</p>
        </div>
        <button
          onClick={() => {
            void uptime.mutate();
            void services.mutate();
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isRefreshing ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-4 grid gap-2">
          <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : null}

      {hasError ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Impossible de charger l&apos;état système. Vérifiez les endpoints de supervision.
        </p>
      ) : null}

      {!isLoading && !hasError ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">État global</p>
              <p className={`mt-1 text-lg font-semibold ${uptimeSummary?.state === "healthy" ? "text-emerald-700" : "text-amber-700"}`}>
                {uptimeSummary?.state === "healthy" ? "Healthy" : "Degraded"}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Checks configurés</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{uptimeSummary?.configuredCount ?? 0}</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Checks manquants</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{uptimeSummary?.missingCount ?? 0}</p>
            </article>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2 font-medium">Service</th>
                  <th className="px-2 py-2 font-medium">Niveau</th>
                  <th className="px-2 py-2 font-medium">Raw</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(services.data?.services ?? {}).map(([name, raw]) => {
                  const label = serviceLevelLabel(raw);
                  return (
                    <tr key={name} className="border-b border-slate-100 text-slate-700">
                      <td className="px-2 py-2">{name}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                            label === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{raw}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
