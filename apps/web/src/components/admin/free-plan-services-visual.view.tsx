"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";

import type { ServiceStatusInfo } from "@/lib/dashboard/status";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";
import { getServicePlanInfo } from "@/lib/environmental-impact-estimator/service-plan";
import {
  formatServiceQuotaStateLabel,
  isDevelopmentAiServiceKey,
} from "@/lib/environmental-impact-estimator/service-risk";
import { cn } from "@/lib/utils";

import {
  buildFreePlanChartEntries,
  buildFreePlanDashboardState,
} from "./free-plan-services-visual.model";
import type {
  FreePlanMetricCard,
  FreePlanSelectionKey,
} from "./free-plan-services-visual.model";
import { SERVICE_VISUALS, TOTAL_VISUAL } from "./free-plan-services-visual.meta";

function formatNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${formatNumber(value, 0)}%`;
}

function formatKg(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${formatNumber(value, 2)} kg CO2e proxy`;
}

function MetricCard({
  card,
}: {
  card: FreePlanMetricCard;
}) {
  return (
    <article
      className={cn(
        "rounded-3xl border p-4 shadow-sm",
        card.tone === "sky" && "border-sky-500/20 bg-sky-500/10 text-sky-100",
        card.tone === "emerald" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
        card.tone === "amber" && "border-amber-500/20 bg-amber-500/10 text-amber-100",
        card.tone === "rose" && "border-rose-500/20 bg-rose-500/10 text-rose-100",
        card.tone === "slate" && "border-white/5 bg-white/5 text-white",
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">
        {card.label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">
        {card.unit === "percent"
          ? formatPercent(card.value)
          : formatKg(card.value)}
      </p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {card.hint}
      </p>
    </article>
  );
}

function ServiceButton({
  label,
  icon: Icon,
  active,
  onClick,
  color,
  selectedKey,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  color: string;
  selectedKey: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-w-[5.75rem] shrink-0 flex-col items-center gap-2 rounded-2xl border px-3 py-2 text-center transition",
        active
          ? "border-white/20 bg-white/10 text-white shadow-lg"
          : "border-white/5 bg-white/5 text-white/60 hover:border-white/10 hover:bg-white/10 hover:text-white",
      )}
      style={{
        boxShadow: active ? `0 0 0 1px ${color}22, 0 14px 30px -18px ${color}` : undefined,
      }}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl border",
          active ? "border-white/20 bg-white/10" : "border-white/10 bg-black/10",
        )}
        style={{
          color,
          boxShadow: selectedKey ? `inset 0 0 0 1px ${color}22` : undefined,
        }}
      >
        <Icon size={18} />
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] leading-none">
        {label}
      </span>
    </button>
  );
}

export function FreePlanServicesVisual({
  services,
  previousServices,
  serviceHealth,
}: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  previousServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  serviceHealth: Record<string, ServiceStatusInfo>;
}) {
  const [selectedKey, setSelectedKey] = useState<FreePlanSelectionKey>("total");
  const [hoveredKey, setHoveredKey] = useState<FreePlanSelectionKey | null>(null);
  const visibleServices = services.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const resolvedSelectedKey =
    selectedKey === "total" || visibleServices.some((service) => service.key === selectedKey)
      ? selectedKey
      : "total";
  const activeKey = hoveredKey ?? resolvedSelectedKey;

  const dashboardState = useMemo(
    () =>
      buildFreePlanDashboardState({
        services: visibleServices,
        previousServices,
        serviceHealth,
        selectedKey: resolvedSelectedKey,
      }),
    [visibleServices, previousServices, serviceHealth, resolvedSelectedKey],
  );

  const chartEntries = useMemo(
    () =>
      buildFreePlanChartEntries({
        services: visibleServices,
        selectedKey: activeKey,
      }),
    [visibleServices, activeKey],
  );

  const selectedService =
    dashboardState.selectionKey === "total"
      ? null
      : visibleServices.find((service) => service.key === dashboardState.selectionKey) ?? null;
  const selectedHealthTone =
    dashboardState.selectedHealthState === "ready"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : dashboardState.selectedHealthState === "external"
        ? "border-sky-500/20 bg-sky-500/10 text-sky-100"
        : dashboardState.selectedHealthState === "defer"
          ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
          : dashboardState.selectedHealthState === "missing"
            ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
            : "border-amber-500/20 bg-amber-500/10 text-amber-100";
  const selectedPlanInfo = selectedService ? getServicePlanInfo(selectedService.key) : null;

  return (
    <section className="rounded-[3rem] border border-white/5 bg-white/5 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Lecture centralisée
            </p>
            <h3 className="mt-1 text-2xl font-black text-white">
              Sélecteur des plans gratuits
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
              Clique sur un service ou sur <span className="font-semibold text-white">Total</span> pour
              mettre à jour automatiquement les cartes de quota et de pollution.
            </p>
          </div>
          <div
            className={cn(
              "rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]",
              selectedHealthTone,
            )}
          >
            {dashboardState.selectedBadge} · {dashboardState.selectedBand}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <ServiceButton
            label="Total"
            icon={TOTAL_VISUAL.icon}
            color={TOTAL_VISUAL.color}
            active={dashboardState.selectionKey === "total"}
            selectedKey={dashboardState.selectionKey === "total"}
            onClick={() => setSelectedKey("total")}
          />
          {visibleServices.map((service) => {
            const meta = SERVICE_VISUALS[service.key];
            const isActive = dashboardState.selectionKey === service.key;
            return (
              <ServiceButton
                key={service.key}
                label={service.label}
                icon={meta.icon}
                color={meta.color}
                active={isActive}
                selectedKey={isActive}
                onClick={() => setSelectedKey(service.key)}
              />
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <article className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Plans et quotas
                </p>
                <h4 className="mt-1 text-2xl font-black text-white">
                  Qui pèse le plus
                </h4>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                  La répartition est lisible uniquement ici, parce qu&apos;elle compare
                  directement les services qui composent l&apos;ACV numérique de CleanMyMap.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                {dashboardState.selectionKey === "total"
                  ? "Vue totale"
                  : dashboardState.selectedLabel}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {chartEntries.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div className="flex h-14 overflow-hidden rounded-full">
                      {chartEntries.map((entry) => {
                        const isActive = activeKey === entry.key;
                        const isSelected = dashboardState.selectionKey === "total" || entry.selected;
                        return (
                          <button
                            key={entry.key}
                            type="button"
                            onMouseEnter={() => setHoveredKey(entry.key)}
                            onMouseLeave={() => setHoveredKey(null)}
                            onClick={() => {
                              setSelectedKey(entry.key);
                              setHoveredKey(entry.key);
                            }}
                            className={cn(
                              "relative flex h-full min-w-0 items-center justify-center border-r border-black/20 last:border-r-0",
                              isActive ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]" : "opacity-80",
                            )}
                            style={{
                              width: `${Math.max(0, entry.value)}%`,
                              backgroundColor: entry.color,
                              opacity: isSelected ? 1 : 0.34,
                            }}
                            title={`${entry.label}: ${formatPercent(entry.value)}`}
                            aria-label={`${entry.label} ${formatPercent(entry.value)} du total`}
                          >
                            {entry.value >= 6 ? (
                              <span className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                                {formatPercent(entry.value)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                    <span>0%</span>
                    <span>{formatPercent(100)}</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                        Quota principal
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {dashboardState.selectedPrimaryQuotaState === "NA"
                          ? "NA"
                          : `${dashboardState.selectedPrimaryQuotaLabel} · ${formatPercent(
                              dashboardState.quotaCards[0]?.value ?? null,
                            )}`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                        État du quota
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {dashboardState.selectedPrimaryQuotaState === "NA"
                          ? "NA"
                          : formatServiceQuotaStateLabel(
                              dashboardState.selectedPrimaryQuotaState as
                                | "ok"
                                | "attention"
                                | "proche limite"
                                | "dépassé"
                                | "NA",
                            )}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-[180px] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-black/20 text-sm text-white/35">
                  Aucun service disponible pour le moment.
                </div>
              )}
            </div>
          </article>

          <aside className="space-y-3 rounded-[2.5rem] border border-white/5 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Légende
                </p>
                <h4 className="mt-1 text-xl font-black text-white">
                  Services principaux
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  Les services les plus lourds sont listés en premier, puis le bloc
                  autres rassemble le reste de la répartition.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {chartEntries.length > 0 ? (
                <>
                  {chartEntries.slice(0, 5).map((entry) => {
                    const meta = SERVICE_VISUALS[entry.key];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={entry.key}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20"
                          style={{ color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}22` }}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {entry.label}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
                            Part de l&apos;impact numérique estimé
                          </p>
                        </div>
                        <p className="text-sm font-black text-white">
                          {formatPercent(entry.value)}
                        </p>
                      </div>
                    );
                  })}

                  {chartEntries.length > 5 ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/60">
                        ...
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          Autres ({chartEntries.length - 5})
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
                          Reste du portefeuille
                        </p>
                      </div>
                      <p className="text-sm font-black text-white">
                        {formatPercent(
                          chartEntries
                            .slice(5)
                            .reduce((sum, item) => sum + (item.value ?? 0), 0),
                        )}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                  NA
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                Vue sélectionnée
              </p>
              <h5 className="mt-1 text-lg font-black text-white">
                {dashboardState.selectedLabel}
              </h5>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {dashboardState.selectedDescription}
              </p>
              {selectedPlanInfo ? (
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Plan {selectedPlanInfo.type}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Prix {selectedPlanInfo.price}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4 text-xs leading-relaxed text-white/55">
              {dashboardState.selectionKey !== "total" && selectedService ? (
                selectedService.description
              ) : (
                <>La vue Total agrège tous les services du graphique de comparaison.</>
              )}
            </div>
          </aside>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboardState.quotaCards.map((card) => (
            <MetricCard key={card.label} card={card} />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboardState.impactCards.map((card) => (
            <MetricCard key={card.label} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
