import type { EnvironmentalImpactEstimateModel } from "@/lib/environmental-impact-estimator/types";
import { cn } from "@/lib/utils";

type InfrastructureSectionProps = {
  model: EnvironmentalImpactEstimateModel;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOneDecimal(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTwoDecimals(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function InfrastructureServicesSection({ model }: InfrastructureSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white">
            Services d&apos;infrastructure
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            Vercel, Supabase, ChatGPT hors Codex, Codex et les autres postes visibles
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white">
            Les activités des services restent distinctes et observables; elles ne sont pas
            converties en impact physique sans mesure ou facteur audité. ChatGPT hors Codex reste NA.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white">
          {model.infrastructure.mode === "measured"
            ? model.infrastructure.usage.source === "input"
              ? "usage dynamique"
              : "dérivé"
            : "référence"}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {model.infrastructure.services.map((service) => (
          <article
            key={service.key}
            className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">{service.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-white">
                  {service.description}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-black uppercase tracking-[0.2em]",
                  service.status === "ready"
                    ? "text-emerald-200"
                    : service.status === "derived"
                      ? "text-sky-200"
                      : service.status === "partial"
                        ? "text-amber-200"
                        : "text-red-200",
                )}
              >
                {service.status === "derived" ? "dérivé" : service.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
                  Mensuel
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {service.monthlyKgCo2eProxy === null
                    ? "NA"
                    : `${formatTwoDecimals(service.monthlyKgCo2eProxy)} kg`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
                  Annuel
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {service.annualKgCo2eProxy === null
                    ? "NA"
                    : `${formatTwoDecimals(service.annualKgCo2eProxy)} kg`}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-white">
              {service.sourceNote}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white">
              {service.metricCount} métrique
              {service.metricCount > 1 ? "s" : ""}, {service.referenceMetricCount} en
              référence. Part du total mensuel: {formatOneDecimal(service.sharePercent)}%.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white">
              Confiance: {formatCount(service.confidencePercent)}%, incertitude: ±
              {formatCount(service.uncertaintyPercent)}%.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function InfrastructureUsageSummary({ model }: InfrastructureSectionProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {[
        {
          label: "Pages vues / mois",
          value: model.infrastructure.usage.monthlyPageViews,
        },
        {
          label: "Utilisateurs actifs / mois",
          value: model.infrastructure.usage.monthlyActiveUsers,
        },
        {
          label: "Croissance mensuelle",
          value: `${formatOneDecimal(model.infrastructure.usage.growthRateMonthly * 100)}%`,
        },
        {
          label: "Horizon de projection",
          value: `${formatCount(model.infrastructure.usage.horizonMonths)} mois`,
        },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
            {item.label}
          </p>
          <p className="mt-2 text-lg font-black text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
