"use client";

import useSWR from "swr";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import {
  serviceLevelLabel,
  summarizeUptime,
  type ServicesPayload,
  type UptimePayload,
} from "@/lib/dashboard/status";
import { swrSupervisionOptions } from "@/lib/swr-config";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Erreur API (${response.status}) sur ${url}`);
  }
  return (await response.json()) as T;
};

type UptimeSummary = ReturnType<typeof summarizeUptime>;

function SystemStatusRefreshButton({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <CmmButton type="button" size="sm" loading={isRefreshing} onClick={onRefresh}>
      {isRefreshing ? "Actualisation…" : "Rafraîchir"}
    </CmmButton>
  );
}

function SystemStatusLoadingState() {
  return (
    <div
      className="mt-4 grid gap-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement de l’état des intégrations"
    >
      <CmmSkeleton variant="list-item" animation="pulse" className="h-11 rounded-lg" aria-hidden="true" />
      <CmmSkeleton variant="list-item" animation="pulse" className="h-11 rounded-lg" aria-hidden="true" />
    </div>
  );
}

function SystemStatusErrorState({
  isRefreshing,
  onRetry,
}: {
  isRefreshing: boolean;
  onRetry: () => void;
}) {
  return (
    <CmmFeedback
      tone="error"
      title="État des intégrations indisponible"
      className="mt-4"
      action={
        <CmmButton type="button" size="sm" tone="primary" loading={isRefreshing} onClick={onRetry}>
          Réessayer
        </CmmButton>
      }
    >
      Impossible de charger l&apos;état système. Vérifiez les endpoints de
      supervision.
    </CmmFeedback>
  );
}

function StatusMetric({
  label,
  value,
  valueClassName = "cmm-text-primary",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClassName}`}>{value}</p>
    </article>
  );
}

function SystemStatusHealthMetrics({ uptimeSummary }: { uptimeSummary: UptimeSummary | null }) {
  const uptimeHealthy = uptimeSummary?.state === "healthy";
  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <StatusMetric
          label="État global"
          value={uptimeHealthy ? "OK" : "Dégradé"}
          valueClassName={uptimeHealthy ? "text-emerald-700" : "text-amber-700"}
        />
        <StatusMetric label="Checks critiques OK" value={uptimeSummary?.criticalConfiguredCount ?? 0} />
        <StatusMetric label="Checks critiques en alerte" value={uptimeSummary?.criticalAlertCount ?? 0} />
        <StatusMetric label="Optionnels en alerte" value={uptimeSummary?.optionalAlertCount ?? 0} />
      </div>

    </>
  );
}

function SystemStatusOptionalMetrics({ uptimeSummary }: { uptimeSummary: UptimeSummary | null }) {
  const optionalHealthy = uptimeSummary?.optionalStatus === "ok";
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">Intégrations optionnelles</p>
      <p className={`mt-1 cmm-text-small font-semibold ${optionalHealthy ? "text-emerald-700" : "text-amber-700"}`}>
        {optionalHealthy ? "OK" : "Alerte"}
      </p>
      <p className="mt-1 cmm-text-caption cmm-text-secondary">
        Alertes détectées : {uptimeSummary?.optionalAlertCount ?? 0}
      </p>
    </article>
  );
}

function SystemStatusServiceMetrics({ serviceSummary }: { serviceSummary: ServicesPayload["summary"] | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <StatusMetric label="Services critiques OK" value={serviceSummary?.criticalReadyCount ?? 0} />
      <StatusMetric label="Services critiques en alerte" value={serviceSummary?.criticalAlertCount ?? 0} />
      <StatusMetric label="Services optionnels en alerte" value={serviceSummary?.optionalAlertCount ?? 0} />
      <StatusMetric label="Intégrations externes suivies" value={serviceSummary?.externalTrackedCount ?? 0} />
    </div>
  );
}

function SystemStatusSummary({
  uptimeSummary,
  serviceSummary,
}: {
  uptimeSummary: UptimeSummary | null;
  serviceSummary: ServicesPayload["summary"] | null;
}) {
  return (
    <>
      <SystemStatusHealthMetrics uptimeSummary={uptimeSummary} />
      <div className="grid gap-3 md:grid-cols-2">
        <StatusMetric
          label="Santé critique"
          value={uptimeSummary?.criticalStatus === "ok" ? "OK" : "Dégradé"}
          valueClassName={uptimeSummary?.criticalStatus === "ok" ? "text-emerald-700" : "text-amber-700"}
        />
        <SystemStatusOptionalMetrics uptimeSummary={uptimeSummary} />
      </div>
      <SystemStatusServiceMetrics serviceSummary={serviceSummary} />
    </>
  );
}

function SystemStatusTimeline({
  serviceTimeline,
  generatedAt,
}: {
  serviceTimeline: NonNullable<ServicesPayload["timeline"]>;
  generatedAt?: string | null;
}) {
  if (serviceTimeline.length === 0) {
    return (
      <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-800">Aucune alerte récente</p>
        <p className="mt-1 cmm-text-small text-emerald-700">
          Tous les services supervisés sont dans un état nominal ou externe sans incident remonté.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">Timeline courte des alertes</p>
          <p className="mt-1 cmm-text-small cmm-text-secondary">
            Vue synthétique des services à surveiller ou à corriger en priorité.
          </p>
        </div>
        <p className="cmm-text-caption cmm-text-muted">
          {generatedAt ? new Date(generatedAt).toLocaleString("fr-FR") : ""}
        </p>
      </div>
      <ol className="mt-4 space-y-3">
        {serviceTimeline.map((event) => {
          const critical = event.severity === "critical";
          return (
            <li key={event.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold cmm-text-primary">{event.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 cmm-text-caption font-semibold uppercase tracking-wide ${
                    critical ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {critical ? "Critique" : "Surveillance"}
                </span>
              </div>
              <p className="mt-1 cmm-text-small cmm-text-secondary">{event.detail}</p>
              <p className="mt-1 cmm-text-caption cmm-text-muted">
                {event.service} · {new Date(event.happenedAt).toLocaleString("fr-FR")}
              </p>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function SystemStatusServiceTable({ services }: { services: ServicesPayload["services"] }) {
  return (
    <div className="cmm-data-table-wrap">
      <table className="cmm-data-table cmm-text-small">
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Description</th>
            <th scope="col">Criticité</th>
            <th scope="col">Niveau</th>
            <th scope="col">Lecture</th>
            <th scope="col">État brut</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(services).map(([name, service]) => {
            const label = serviceLevelLabel(service.state);
            const ready = label === "ok";
            return (
              <tr key={name} className="cmm-text-secondary">
                <td className="font-semibold">{service.label}</td>
                <td className="cmm-text-caption cmm-text-secondary">{service.description}</td>
                <td className="cmm-text-caption uppercase tracking-wide">{service.category}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-0.5 cmm-text-caption font-semibold uppercase tracking-wide ${
                      ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {ready ? "OK" : "Alerte"}
                  </span>
                </td>
                <td className="cmm-text-caption cmm-text-secondary">
                  {"statusMessage" in service ? service.statusMessage : ""}
                </td>
                <td className="font-mono cmm-text-caption">{service.state}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SystemStatusDataView({
  uptimeSummary,
  serviceSummary,
  serviceTimeline,
  services,
}: {
  uptimeSummary: UptimeSummary | null;
  serviceSummary: ServicesPayload["summary"] | null;
  serviceTimeline: NonNullable<ServicesPayload["timeline"]>;
  services: ServicesPayload["services"];
}) {
  return (
    <div className="mt-4 space-y-4">
      <SystemStatusSummary uptimeSummary={uptimeSummary} serviceSummary={serviceSummary} />
      <SystemStatusTimeline serviceTimeline={serviceTimeline} generatedAt={serviceSummary?.generatedAt} />
      <SystemStatusServiceTable services={services} />
    </div>
  );
}

export function SystemStatusPanel() {
  const uptime = useSWR<UptimePayload>("/api/uptime", fetcher, swrSupervisionOptions);
  const services = useSWR<ServicesPayload>("/api/services", fetcher, swrSupervisionOptions);
  const isLoading = uptime.isLoading || services.isLoading;
  const isRefreshing = uptime.isValidating || services.isValidating;
  const hasError = Boolean(uptime.error || services.error);
  const uptimeSummary = uptime.data ? summarizeUptime(uptime.data) : null;
  const serviceSummary = services.data?.summary ?? null;
  const serviceTimeline = services.data?.timeline ?? [];
  const refresh = () => {
    void uptime.mutate();
    void services.mutate();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold cmm-text-primary">État des intégrations</h2>
          <p className="mt-1 cmm-text-small cmm-text-secondary">
            Synthèse temps réel des endpoints de supervision (`/api/uptime`, `/api/services`).
          </p>
        </div>
        <SystemStatusRefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />
      </div>

      {isLoading ? <SystemStatusLoadingState /> : null}
      {hasError ? <SystemStatusErrorState isRefreshing={isRefreshing} onRetry={refresh} /> : null}
      {!isLoading && !hasError ? (
        <SystemStatusDataView
          uptimeSummary={uptimeSummary}
          serviceSummary={serviceSummary}
          serviceTimeline={serviceTimeline}
          services={services.data?.services ?? {}}
        />
      ) : null}
    </section>
  );
}
