"use client";

import { Bell, CreditCard, ExternalLink, Globe, PieChart } from "lucide-react";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { formatServiceQuotaStateLabel } from "@/lib/environmental-impact-estimator/service-risk";
import { cn } from "@/lib/utils";
import { TAB_ITEMS, type MethodologyTabKey } from "./free-plan-services-methodology-visual.data";
import { QuotaMetricRow, ServiceIconCard, TabPill } from "./free-plan-services-methodology-visual.cards";
import {
  formatFallbackStatusLabel,
  formatImpactKg,
  getPlanTone,
  getStateTone,
  type DisplayService,
} from "./free-plan-services-methodology-visual.logic";

type QuotaViewProps = {
  displayedServices: DisplayService[];
  githubStats?: GitHubRepositoryStats | null;
  isFrench: boolean;
  activeTab: MethodologyTabKey;
  onTabChange: (tab: MethodologyTabKey) => void;
  selectedKey: DisplayService["key"];
  hoveredKey: DisplayService["key"] | null;
  onSelectService: (key: DisplayService["key"]) => void;
  onHoverService: (key: DisplayService["key"] | null) => void;
};

export function FreePlanServicesMethodologyQuotaView({
  displayedServices,
  githubStats,
  isFrench,
  activeTab,
  onTabChange,
  selectedKey,
  hoveredKey,
  onSelectService,
  onHoverService,
}: QuotaViewProps) {
  const activeKey = hoveredKey ?? selectedKey;
  const selectedService =
    displayedServices.find((service) => service.key === activeKey) ?? displayedServices[0] ?? null;
  const SelectedIcon = selectedService?.icon ?? PieChart;
  const paidPlansCount = displayedServices.filter((service) => service.planType === "payant").length;
  const nearLimitCount = displayedServices.filter(
    (service) => service.state === "proche limite" || service.state === "dépassé",
  ).length;
  const totalMonthlyKgCo2eProxy = displayedServices.reduce(
    (sum, service) => sum + (service.service?.monthlyKgCo2eProxy ?? 0),
    0,
  );

  const title = isFrench ? "Quotas & plans des services web" : "Web services quotas and plans";
  const selectedServiceLink = selectedService?.linkHref ? <a href={selectedService.linkHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-100"><ExternalLink size={14} />{selectedService.linkLabel ?? "Ouvrir le repo"}</a> : null;
  const subtitle = isFrench
    ? "L'onglet quotas répond à une seule question: est-ce qu'un service risque de dépasser son plan ? GitHub est relié au dépôt réel."
    : "The quota tab answers one question: is a service at risk of exceeding its plan? GitHub is linked to the real repository.";

  return (
    <section
      id="impact-services"
      className="rounded-[2.75rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] md:p-8"
    >
      <div className="space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-500/75">
              {isFrench ? "Pilotage des quotas" : "Quota pilot"}
            </p>
            <h3 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {title}
            </h3>
            <p className="max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {TAB_ITEMS.map((tab) => (
              <TabPill
                key={tab.key}
                tab={tab}
                active={tab.key === activeTab}
                onClick={() => onTabChange(tab.key)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {displayedServices.map((service) => (
            <ServiceIconCard
              key={service.key}
              service={service}
              selected={service.key === activeKey}
              onSelect={onSelectService}
              onHover={onHoverService}
            />
          ))}
        </div>

        {githubStats ? (
          <div className="flex justify-end">
            <a
              href={githubStats.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.24)] transition hover:border-slate-300 hover:text-slate-900"
            >
              <ExternalLink size={14} />
              {isFrench ? "Ouvrir le repo GitHub" : "Open GitHub repo"}
            </a>
          </div>
        ) : null}

        <div className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
                style={{
                  color: selectedService?.accent ?? "#0f172a",
                  boxShadow: selectedService ? `inset 0 0 0 1px ${selectedService.accent}1c` : undefined,
                }}
              >
                <SelectedIcon size={28} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-2xl font-black text-slate-950">
                    {selectedService?.label ?? "NA"}
                  </h4>
                  <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getPlanTone(selectedService?.planType ?? "NA"))}>
                    {selectedService?.planType ?? "NA"}
                  </span>
                  {selectedService?.price && selectedService.price !== "NA" ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                      {selectedService.price}
                    </span>
                  ) : null}
                </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{isFrench ? "Survolez une carte pour afficher le détail" : "Hover a card to reveal details"}</span>
                <span className="text-slate-300">•</span>
                <span>
                  {isFrench
                      ? "Le clic conserve le dernier service consulté."
                      : "Click keeps the last viewed service."}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getStateTone(selectedService?.state ?? "NA"))}>
                {selectedService?.state === "NA"
                  ? formatFallbackStatusLabel("quota")
                  : selectedService
                    ? formatServiceQuotaStateLabel(selectedService.state)
                    : formatFallbackStatusLabel("quota")}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {selectedService?.service && selectedService.metrics.length > 0 ? (
              <div className="space-y-3">
                {selectedService.metrics.map((metric) => (
                  <QuotaMetricRow key={metric.key} metric={metric} />
                ))}
              </div>
            ) : null}

            {selectedService?.details.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedService.details.map((detail) => (
                    <span
                      key={detail}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600"
                    >
                      {detail}
                    </span>
                  ))}
                </div>

                {selectedServiceLink}
              </div>
            ) : selectedService?.service && selectedService.metrics.length === 0 ? (
              <div className="space-y-4">
                {selectedServiceLink}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-5">
                <p className="text-lg font-black text-slate-950">
                  {formatFallbackStatusLabel("quota")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {isFrench
                    ? "Aucune donnée de quota n'est branchée pour ce service dans le repo."
                    : "No quota data is connected for this service in the repo."}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.24)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-50 text-rose-600">
              <Globe size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-600">{isFrench ? "Services suivis" : "Tracked services"}</p>
              <p className="mt-1 text-4xl font-black text-rose-600">{displayedServices.length}</p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.24)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-50 text-rose-600">
              <CreditCard size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-600">{isFrench ? "Plans payants" : "Paid plans"}</p>
              <p className="mt-1 text-4xl font-black text-rose-600">{paidPlansCount}</p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.24)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-50 text-rose-600">
              <Bell size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-600">
                {isFrench ? "Services proches d'une limite" : "Services near a limit"}
              </p>
              <p className="mt-1 text-4xl font-black text-rose-600">{nearLimitCount}</p>
            </div>
          </article>
        </div>

        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-600/70">
                {isFrench ? "Documentation consultable" : "Consultable documentation"}
              </p>
              <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                {isFrench ? "Méthodologie de lecture des quotas" : "Quota reading methodology"}
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {isFrench
                ? "Le document s'ouvre dans le lecteur de documentation du site."
                : "The document opens in the site documentation viewer."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-1">
            <a
              href="/docs/plans/rapport_impact/quotas_plans_methodologie.md"
              className="rounded-2xl border border-rose-200 bg-white px-4 py-4 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <p className="text-sm font-black text-slate-950">
                {isFrench ? "Consulter la fiche quota" : "Open the quota guide"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {isFrench
                  ? "Lecture des plans, des limites réelles et de la règle NA quand la donnée manque."
                  : "Reading of plans, real limits, and the NA rule when data is missing."}
              </p>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600/70">
                quotas_plans_methodologie.md
              </p>
            </a>
          </div>
        </section>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          {isFrench ? (
            <>
              Les services de développement IA restent hors quotas web et doivent apparaître en ACV avec le badge
              {" "}
              <span className="font-semibold text-slate-800">Inclus ACV / Hors production / Hors quotas web</span>.
              {" "}
              Les données absentes restent affichées avec un libellé sobre.
              {" "}
              Le total mensuel affiché ici est
              {" "}
              <span className="font-semibold text-slate-800">{formatImpactKg(totalMonthlyKgCo2eProxy)}</span>.
            </>
          ) : (
            <>
              Development AI services stay outside web quotas and must appear in ACV with the badge
              {" "}
              <span className="font-semibold text-slate-800">Included in LCA / Outside production / Outside web quotas</span>.
              {" "}
              Missing data remains shown with a sober label.
              {" "}
              The monthly total shown here is
              {" "}
              <span className="font-semibold text-slate-800">{formatImpactKg(totalMonthlyKgCo2eProxy)}</span>.
            </>
          )}
        </div>
      </div>
    </section>
  );
}
