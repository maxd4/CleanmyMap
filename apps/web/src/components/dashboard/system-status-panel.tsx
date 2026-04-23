"use client";

import useSWR from "swr";
import {
  serviceLevelLabel,
  summarizeUptime,
  type ServiceStatusInfo,
  type ServicesPayload,
  type UptimePayload,
} from "@/lib/dashboard/status";
import { swrRecentViewOptions } from "@/lib/swr-config";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Erreur API (${response.status}) sur ${url}`);
  }
  return (await response.json()) as T;
};

export function SystemStatusPanel() {
  const uptime = useSWR<UptimePayload>(
    "/api/uptime",
    fetcher,
    swrRecentViewOptions,
  );
  const services = useSWR<ServicesPayload>(
    "/api/services",
    fetcher,
    swrRecentViewOptions,
  );

  const isLoading = uptime.isLoading || services.isLoading;
  const isRefreshing = uptime.isValidating || services.isValidating;
  const hasError = Boolean(uptime.error || services.error);

  const uptimeSummary = uptime.data ? summarizeUptime(uptime.data) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Etat des integrations
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Synthese temps reel des endpoints de supervision (`/api/uptime`,
            `/api/services`).
          </p>
        </div>
        <button
          onClick={() => {
            void uptime.mutate();
            void services.mutate();
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isRefreshing ? "Actualisation..." : "Rafraichir"}
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
          Impossible de charger l&apos;etat systeme. Verifiez les endpoints de
          supervision.
        </p>
      ) : null}

      {!isLoading && !hasError ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Etat global
              </p>
              <p
                className={`mt-1 text-lg font-semibold ${uptimeSummary?.state === "healthy" ? "text-emerald-700" : "text-amber-700"}`}
              >
                {uptimeSummary?.state === "healthy" ? "OK" : "Degrade"}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Checks critiques OK
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {uptimeSummary?.criticalConfiguredCount ?? 0}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Checks critiques en alerte
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {uptimeSummary?.criticalMissingCount ?? 0}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Optionnels en alerte
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {uptimeSummary?.optionalWarningCount ?? 0}
              </p>
            </article>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Sante critique
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${uptimeSummary?.criticalStatus === "ok" ? "text-emerald-700" : "text-amber-700"}`}
              >
                {uptimeSummary?.criticalStatus === "ok" ? "OK" : "Degrade"}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Integrations optionnelles
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${uptimeSummary?.optionalStatus === "ok" ? "text-emerald-700" : "text-amber-700"}`}
              >
                {uptimeSummary?.optionalStatus === "ok" ? "OK" : "Alerte"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Alertes detectees: {uptimeSummary?.optionalWarningCount ?? 0}
              </p>
            </article>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2 font-medium">Service</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium">Niveau</th>
                  <th className="px-2 py-2 font-medium">Etat brut</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(services.data?.services ?? {}).map(
                  ([name, service]) => {
                    const label = serviceLevelLabel(service.state);
                    const labelText = label === "ok" ? "OK" : "Alerte";
                    return (
                      <tr
                        key={name}
                        className="border-b border-slate-100 text-slate-700"
                      >
                        <td className="px-2 py-2 font-semibold">{service.label}</td>
                        <td className="px-2 py-2 text-xs text-slate-600">
                          {service.description}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                              label === "ok"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {labelText}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">{service.state}</td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
