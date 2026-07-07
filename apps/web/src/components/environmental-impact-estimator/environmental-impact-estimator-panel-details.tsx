import { Bot, Eye, FileText, Image as ImageIcon, Layers3, MapPinned, Server } from "lucide-react";
import { ENVIRONMENTAL_IMPACT_POST_DEFINITIONS } from "@/lib/environmental-impact-estimator/constants";
import type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import { cn } from "@/lib/utils";
import {
  formatLifecycleQuantity,
  formatProxyMass,
  formatQuantity,
  formatShortDate,
  formatSecondOrderQuantity,
  formatSharePercent,
} from "./environmental-impact-estimator-panel.helpers";

type EnvironmentalImpactEstimatorPanelDetailsProps = {
  model: EnvironmentalImpactEstimateModel;
  snapshots: EnvironmentalImpactSnapshotRecord[];
};

const ICONS = {
  pageViews: Eye,
  storedImages: ImageIcon,
  apiRequests: Server,
  pdfExports: FileText,
  maps: MapPinned,
  storageGbMonths: Layers3,
  aiCalls: Bot,
} as const;

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

export function EnvironmentalImpactEstimatorPanelDetails({
  model,
  snapshots,
}: EnvironmentalImpactEstimatorPanelDetailsProps) {
  return (
    <>
      <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
              Deuxième ordre
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-white">
              Décomposition environnementale détaillée
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-red-100/40">
            Le total est réparti entre CO2 brut, électricité, autres GES,
            produits chimiques et eau.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {model.infrastructure.secondOrder.factorEstimates.map((factor) => (
            <article
              key={factor.key}
              className="rounded-2xl border border-white/10 bg-black/10 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{factor.label}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    {formatSharePercent(factor.sharePercent)}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                  {factor.source}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                {formatSecondOrderQuantity(factor.quantity, factor.unitLabel)}
              </p>
              <p className="mt-2 text-sm font-black text-white">
                {formatProxyMass(factor.estimatedKgCo2eProxy)}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-red-100/40">
                {factor.rationale}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Total deuxième ordre
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatProxyMass(model.infrastructure.secondOrder.totalKgCo2eProxy)}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-red-100/40">
              Ce total doit rester cohérent avec le premier ordre et servir
              seulement à décomposer le signal.
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-red-100/45">
            {model.infrastructure.secondOrder.notes.join(" ")}
          </p>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
              Empreinte matérielle et cycle de vie
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-white">
              Énergie, carbone, eau, matière et fin de vie
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-red-100/40">
            Cette couche décrit l&apos;empreinte lifecycle du projet sans la
            confondre avec le CO2e opérationnel.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Total lifecycle
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatProxyMass(model.lifecycle.totalKgCo2eProxy)}
              </p>
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-red-100/40">
              {model.lifecycle.notes.join(" ")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {model.lifecycle.axisEstimates.map((axis) => (
            <article
              key={axis.key}
              className="rounded-2xl border border-white/10 bg-black/10 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{axis.label}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    {formatSharePercent(axis.sharePercent)}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                  {axis.source}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                {formatLifecycleQuantity(axis.quantity, axis.unitLabel)}
              </p>
              <p className="mt-2 text-sm font-black text-white">
                {formatProxyMass(axis.estimatedKgCo2eProxy)}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-red-100/40">
                {axis.rationale}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {model.lifecycle.componentEstimates.map((component) => (
            <article
              key={component.key}
              className="rounded-2xl border border-white/10 bg-black/10 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{component.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-red-100/45">
                    {component.description}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                  {formatSharePercent(component.sharePercent)}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                {formatLifecycleQuantity(component.quantity, component.unitLabel)}
              </p>
              <p className="mt-2 text-sm font-black text-white">
                {formatProxyMass(component.estimatedKgCo2eProxy)}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-red-100/40">
                {component.rationale}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
              Services d&apos;infrastructure
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-white">
              Vercel, Supabase, GPT-5.4 mini, Codex et les autres postes visibles
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-red-100/45">
              GPT-5.4 mini — développement du site et les sessions Codex sont suivis comme deux
              postes distincts ACV, chacun avec ses propres hypothèses et son propre poids dans le
              calcul.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
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
                  <p className="mt-1 text-xs leading-relaxed text-red-100/45">
                    {service.description}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
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
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    Mensuel
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {formatTwoDecimals(service.monthlyKgCo2eProxy ?? 0)} kg
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    Annuel
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {formatTwoDecimals(service.annualKgCo2eProxy ?? 0)} kg
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                {service.sourceNote}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                {service.metricCount} métrique
                {service.metricCount > 1 ? "s" : ""}, {service.referenceMetricCount} en
                référence. Part du total mensuel: {formatOneDecimal(service.sharePercent)}%.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                Confiance: {formatCount(service.confidencePercent)}%, incertitude: ±
                {formatCount(service.uncertaintyPercent)}%.
              </p>
            </article>
          ))}
        </div>
      </div>

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
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
              Détail des postes
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-white">
              Lecture auditable, ligne par ligne
            </h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
            Hypothèses versionnées
          </div>
        </div>

        <div className="space-y-3">
          {ENVIRONMENTAL_IMPACT_POST_DEFINITIONS.map((definition) => {
            const sitePost = model.site.posts.find((post) => post.key === definition.key);
            const userPost = model.user.posts.find((post) => post.key === definition.key);
            const Icon = ICONS[definition.key];

            return (
              <article
                key={definition.key}
                className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-red-200">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">{definition.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-100/45">
                      {definition.description}
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                      {definition.proxyRationale}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                    Site
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {formatQuantity(sitePost?.quantity ?? null, definition.unitLabel)}
                  </p>
                  <p className="mt-1 text-xs text-red-100/45">
                    {formatProxyMass(sitePost?.estimatedKgCo2eProxy ?? null)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                    Utilisateur
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {formatQuantity(userPost?.quantity ?? null, definition.unitLabel)}
                  </p>
                  <p className="mt-1 text-xs text-red-100/45">
                    {formatProxyMass(userPost?.estimatedKgCo2eProxy ?? null)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Hypothèses retenues
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-red-100/55">
            {model.methodology.hypotheses.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Limites et garde-fous
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-red-100/55">
            {model.methodology.limitations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <div className="text-red-300">✦</div>
          <div>
            <p className="text-sm font-black text-white">
              Structure prête pour le rapport d&apos;impact IA
            </p>
            <p className="text-xs leading-relaxed text-red-100/45">
              Les postes sont déjà modélisés pour accueillir des flux réels sans casser le
              contrat de calcul ni la lisibilité du rapport.
            </p>
          </div>
        </div>
      </div>

      {snapshots.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
                Historique Supabase
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                Snapshots enregistrés du calculateur
              </h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
              {snapshots.length} snapshot{snapshots.length > 1 ? "s" : ""}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {snapshots.slice(0, 4).map((snapshot) => (
              <article
                key={`${snapshot.snapshotKey}-${snapshot.snapshotDate}`}
                className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                  {snapshot.snapshotDate}
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {formatProxyMass(snapshot.totalKgCo2eProxy)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                  Confiance {formatCount(snapshot.confidencePercent)}%, généré le{" "}
                  {formatShortDate(snapshot.generatedAt)}.
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
