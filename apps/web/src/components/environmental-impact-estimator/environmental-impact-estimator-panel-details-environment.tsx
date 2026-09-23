import type { EnvironmentalImpactEstimateModel } from "@/lib/environmental-impact-estimator/types";
import { buildWaterEstimate } from "@/lib/environmental-impact-estimator/services/water";
import {
  formatLifecycleQuantity,
  formatProxyMass,
  formatSecondOrderQuantity,
  formatSharePercent,
} from "./environmental-impact-estimator-panel.helpers";

type EnvironmentSectionProps = {
  model: EnvironmentalImpactEstimateModel;
};

export function SecondOrderSection({ model }: EnvironmentSectionProps) {
  return (
    <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white">
            Deuxième ordre
          </p>
          <h4 className="mt-1 text-lg font-black tracking-tight text-white">
            Décomposition environnementale détaillée
          </h4>
        </div>
        <p className="text-xs leading-relaxed text-white">
          Les familles CO₂e sont des proxys de lecture, pas un inventaire physique séparé.
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
                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                  {formatSharePercent(factor.sharePercent)}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                {factor.source}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white">
              {formatSecondOrderQuantity(factor.quantity, factor.unitLabel)}
            </p>
            {factor.key === "electricity" ? (
              <p className="mt-2 cmm-text-small leading-relaxed text-white">
                {model.infrastructure.secondOrder.electricity.calculation ===
                "measured_kwh_to_co2e"
                  ? "Calcul : kWh réel × facteur électrique."
                  : model.infrastructure.secondOrder.electricity.calculation ===
                      "proxy_equivalent"
                    ? "Équivalent électrique estimé : pas une consommation mesurée."
                    : "À compléter : aucun signal électrique disponible."}
              </p>
            ) : null}
            <p className="mt-2 text-sm font-black text-white">
              {formatProxyMass(factor.estimatedKgCo2eProxy)}
            </p>
            <p className="mt-2 cmm-text-small leading-relaxed text-white">
              {factor.rationale}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
              Total deuxième ordre
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {formatProxyMass(model.infrastructure.secondOrder.totalKgCo2eProxy)}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-white">
            Ce total doit rester cohérent avec le premier ordre et servir
            seulement à décomposer le signal.
          </p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white">
          {model.infrastructure.secondOrder.notes.join(" ")}
        </p>
      </div>
    </section>
  );
}

export function WaterSection({ model }: EnvironmentSectionProps) {
  const water = model.infrastructure.water ?? buildWaterEstimate(model.infrastructure.usage);
  const formatLiters = (value: number | null) =>
    value === null
      ? "À compléter"
      : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} L`;
  const availabilityLabel =
    water.availability === "available"
      ? "disponible"
      : water.availability === "partial"
        ? "partiel"
        : "à compléter";

  return (
    <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white">
            Eau estimée
          </p>
          <h4 className="mt-1 text-lg font-black tracking-tight text-white">
            Eau directe et eau indirecte
          </h4>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
          {availabilityLabel}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white">
        L’eau estimée distingue la consommation directe du site et l’eau indirecte liée à l’électricité. Ces valeurs restent des ordres de grandeur.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm font-black text-white">Eau directe consommée sur site</p>
          <p className="mt-3 text-lg font-black text-white">{formatLiters(water.directWaterConsumptionLiters)}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm font-black text-white">Eau indirecte liée à l’électricité</p>
          <p className="mt-3 text-lg font-black text-white">{formatLiters(water.indirectElectricityWaterLiters)}</p>
          <p className="mt-2 cmm-text-small leading-relaxed text-white">Proxy configuré : {water.factorLitersPerKwh} L/kWh — {water.factorSourceLabel}.</p>
        </article>
        {water.evaporatedWaterLiters !== null ? (
          <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm font-black text-white">dont évaporation</p>
            <p className="mt-3 text-lg font-black text-white">{formatLiters(water.evaporatedWaterLiters)}</p>
          </article>
        ) : null}
        <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm font-black text-white">Eau totale estimée</p>
          <p className="mt-3 text-lg font-black text-white">{formatLiters(water.totalWaterConsumptionLiters)}</p>
        </article>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-white">
        {water.provenance.join(" ")}
      </p>
    </section>
  );
}

export function LifecycleSection({ model }: EnvironmentSectionProps) {
  return (
    <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white">
            Empreinte matérielle et cycle de vie
          </p>
          <h4 className="mt-1 text-lg font-black tracking-tight text-white">
            Énergie, carbone, eau, matière et fin de vie
          </h4>
        </div>
        <p className="text-xs leading-relaxed text-white">
          Cette couche décrit l&apos;empreinte lifecycle du projet sans la
          confondre avec le CO2e opérationnel.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white">
              Total lifecycle
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {formatProxyMass(model.lifecycle.totalKgCo2eProxy)}
            </p>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-white">
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
                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                  {formatSharePercent(axis.sharePercent)}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                {axis.source}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white">
              {formatLifecycleQuantity(axis.quantity, axis.unitLabel)}
            </p>
            <p className="mt-2 text-sm font-black text-white">
              {formatProxyMass(axis.estimatedKgCo2eProxy)}
            </p>
            <p className="mt-2 cmm-text-small leading-relaxed text-white">
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
                <p className="mt-1 text-xs leading-relaxed text-white">
                  {component.description}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                {formatSharePercent(component.sharePercent)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white">
              {formatLifecycleQuantity(component.quantity, component.unitLabel)}
            </p>
            <p className="mt-2 text-sm font-black text-white">
              {formatProxyMass(component.estimatedKgCo2eProxy)}
            </p>
            <p className="mt-2 cmm-text-small leading-relaxed text-white">
              {component.rationale}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
