"use client";

import type { OfferComparison, OfferPlotPoint, OfferUserPreferences } from "@/lib/environmental-impact-estimator/offer-comparison";

const WIDTH = 900;
const HEIGHT = 400;
const PAD = { left: 85, right: 32, top: 24, bottom: 72 } as const;

function formatNumber(value: number, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

/**
 * Vue de décision, pas un système de mesure : ne crée aucune donnée de prix/CO2e.
 * Les points symboliques SVG ne sont pas des contrôles clavier : des boutons
 * natifs leur correspondent intégralement après le graphique.
 */
export function OfferComparisonScatter({
  comparison,
  selectedOfferId,
  onSelect,
  onPreferencesChange,
}: {
  comparison: OfferComparison;
  selectedOfferId: string | null;
  onSelect: (offerId: string) => void;
  onPreferencesChange: (preferences: OfferUserPreferences) => void;
}) {
  const points = comparison.plotPoints;
  const preferences = comparison.preferences;
  // Préférence non environnementale limitée aux quasi-égalités documentées.
  const orderedPoints = [...points].sort((a, b) =>
    Number(b.platformContinuityPreferred) - Number(a.platformContinuityPreferred));
  const chartWidth = WIDTH - PAD.left - PAD.right;
  const chartHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxX = Math.max(
    0.001,
    comparison.robustPriceCapEuroPerSuccess ?? 0,
    ...points.map((point) => point.xEuroPerSuccess),
  ) * 1.10;
  const maxY = Math.max(1, ...points.map((point) => point.yGramsCo2ePerSuccess)) * 1.10;
  const xScale = (cost: number) => PAD.left + (cost / maxX) * chartWidth;
  const yScale = (carbon: number) => PAD.top + chartHeight - (carbon / maxY) * chartHeight;
  const eligibleWithNoCoordinates = comparison.offers.filter((item) =>
    item.eligibility === "ELIGIBLE_PRICE" && !item.canPlot,
  );
  const excluded = comparison.offers.filter((item) =>
    item.eligibility !== "ELIGIBLE_PRICE" && item.eligibility !== "BASELINE",
  );
  const selected = comparison.offers.find((item) => item.offer.id === selectedOfferId) ?? null;
  const formatRange = (range: { min: number; max: number } | null, digits: number, unit: string) =>
    range === null ? "NA" : range.min === range.max
      ? `${formatNumber(range.min, digits)} ${unit}`
      : `[${formatNumber(range.min, digits)} ; ${formatNumber(range.max, digits)}] ${unit}`;

  return (
    <section aria-labelledby="ai-offers-chart-title" className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h2 id="ai-offers-chart-title" className="text-lg font-bold text-white">
        Coût et émissions par tâche réussie
      </h2>
      <fieldset className="mt-4 grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2">
        <legend className="px-2 text-sm font-semibold text-white">Mon mode d'accès à l'IA</legend>
        <div className="min-w-0">
          <label htmlFor="ai-comparison-billing" className="mb-1 block text-sm text-white/85">
            Abonnement ou API
          </label>
          <select id="ai-comparison-billing" value={preferences.billingMode}
            className="w-full rounded-lg border border-white/25 bg-[#171717] p-2 text-white"
            onChange={(event: { target: { value: string } }) => onPreferencesChange({
              billingMode: event.target.value as OfferUserPreferences["billingMode"],
              codingPlatformId: preferences.codingPlatformId,
              currentPlanId: preferences.currentPlanId,
            })}
          >
            <option value="SUBSCRIPTION">Abonnement</option>
            <option value="API">API / facturation à l'usage</option>
            <option value="LOCAL_OWNED">Exécution locale sur mon matériel</option>
          </select>
        </div>
        {preferences.billingMode === "SUBSCRIPTION" ? (
          <>
            <div className="min-w-0">
              <label htmlFor="ai-comparison-platform" className="mb-1 block text-sm text-white/85">
                Plateforme de code utilisée
              </label>
              <input id="ai-comparison-platform" type="text" value={preferences.codingPlatformId ?? ""}
                placeholder="Ex. Codex, Cursor, Claude Code, Copilot"
                autoComplete="off"
                className="w-full rounded-lg border border-white/25 bg-[#171717] p-2 text-white"
                onChange={(event: { target: { value: string } }) => onPreferencesChange({
                  ...preferences, codingPlatformId: event.target.value,
                })}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="ai-comparison-plan" className="mb-1 block text-sm text-white/85">
                Forfait souscrit, si connu
              </label>
              <input id="ai-comparison-plan" type="text" value={preferences.currentPlanId ?? ""}
                placeholder="Forfait permettant de vérifier l'accès aux modèles"
                autoComplete="off"
                className="w-full rounded-lg border border-white/25 bg-[#171717] p-2 text-white"
                onChange={(event: { target: { value: string } }) => onPreferencesChange({
                  ...preferences, currentPlanId: event.target.value,
                })}
              />
            </div>
            <p className="self-center text-xs text-white/70">
              Le bonus de continuité ne s'applique que si modèle, raisonnement et forfait sont
              vérifiés. Il ne compense jamais une baisse significative de qualité.
            </p>
          </>
        ) : null}
      </fieldset>
      <p className="mt-2 text-sm text-white/70">
        Les points représentent uniquement des offres documentées, économiquement admissibles et
        dont les deux axes sont chiffrés. Les options sur le front de Pareto sont soulignées.
        Le CO₂e ne représente pas tous les impacts environnementaux.
      </p>
      {points.length === 0 ? (
        <p className="mt-4 text-sm text-white/80" role="status">
          Aucun point comparable : prix et émissions vérifiés sont nécessaires.
        </p>
      ) : (
        <>
          <svg
            role="img"
            aria-label="Nuage de points : en abscisse les euros par tâche réussie, en ordonnée les grammes de CO2 équivalent par tâche réussie. Une liste de boutons accessible suit."
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="mt-4 w-full"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((step) => (
              <g key={`grid-${step}`}>
                <line x1={PAD.left} x2={PAD.left + chartWidth} y1={yScale(step * maxY)} y2={yScale(step * maxY)} stroke="rgba(255,255,255,.14)" />
                <text x={PAD.left - 12} y={yScale(step * maxY) + 5} textAnchor="end" fill="#fff" fontSize="13">
                  {formatNumber(step * maxY, 1)}
                </text>
                <text x={xScale(step * maxX)} y={HEIGHT - PAD.bottom + 23} textAnchor="middle" fill="#fff" fontSize="13">
                  {formatNumber(step * maxX, 3)}
                </text>
                <line x1={xScale(step * maxX)} x2={xScale(step * maxX)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="rgba(255,255,255,.07)" />
              </g>
            ))}
            <line x1={PAD.left} x2={PAD.left + chartWidth} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom} stroke="#fff" />
            <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#fff" />
            {comparison.robustPriceCapEuroPerSuccess !== null ? (
              <line
                x1={xScale(comparison.robustPriceCapEuroPerSuccess)}
                x2={xScale(comparison.robustPriceCapEuroPerSuccess)}
                y1={PAD.top} y2={HEIGHT - PAD.bottom}
                stroke="#f59e0b" strokeWidth={2} strokeDasharray="7 6"
              />
            ) : null}
            {points.map((point: OfferPlotPoint) => (
              <g key={point.id} aria-hidden="true">
                <circle
                  cx={xScale(point.xEuroPerSuccess)} cy={yScale(point.yGramsCo2ePerSuccess)}
                  r={selectedOfferId === point.id ? 10 : point.isReference ? 9 : 7}
                  fill={point.isReference ? "#60a5fa" : point.onPriceCarbonParetoFront ? "#34d399" : "#9ca3af"}
                  stroke={selectedOfferId === point.id ? "#fff" : "#111827"}
                  strokeWidth={selectedOfferId === point.id ? 3 : 2}
                />
              </g>
            ))}
            <text x={WIDTH / 2} y={HEIGHT - 8} textAnchor="middle" fill="#fff" fontSize="16">
              Coût complet (€ / tâche réussie)
            </text>
            <text x={18} y={HEIGHT / 2} transform={`rotate(-90 18 ${HEIGHT / 2})`} textAnchor="middle" fill="#fff" fontSize="16">
              Émissions (gCO₂e / tâche réussie)
            </text>
          </svg>
          <p className="mt-2 text-xs text-white/65">
            Bleu : référence ; vert : non dominé en prix/carbone ; gris : admissible mais dominé ;
            ligne orange : plafond +15 %. Les incertitudes sont présentées hors points.
          </p>
        </>
      )}
      <div className="mt-5" role="group" aria-label="Choisir une offre comparable">
        <h3 className="mb-2 font-semibold text-white">Offres à comparer</h3>
        <div className="flex flex-wrap gap-2">
          {orderedPoints.map((point) => (
            <button
              type="button" key={point.id}
              className="rounded-xl border border-white/25 px-3 py-2 text-left text-sm text-white hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              aria-pressed={selectedOfferId === point.id}
              aria-label={`${point.name} : ${formatNumber(point.xEuroPerSuccess)} euro par tâche réussie, ${formatNumber(point.yGramsCo2ePerSuccess, 2)} grammes CO2e par tâche réussie${point.isReference ? ", référence" : ""}`}
              onClick={() => onSelect(point.id)}
            >
              <span className="block font-semibold">{point.name}</span>
              {point.platformContinuityPreferred ? (
                <span className="block text-xs text-emerald-200">Déjà disponible dans votre environnement, quasi-égalité prix/carbone</span>
              ) : null}
              <span className="block text-white/75">{formatNumber(point.xEuroPerSuccess)} € · {formatNumber(point.yGramsCo2ePerSuccess, 2)} gCO₂e</span>
            </button>
          ))}
        </div>
      </div>
      {eligibleWithNoCoordinates.length > 0 ? (
        <div className="mt-5">
          <h3 className="font-semibold text-white">Offres économiquement admissibles, non traçables en points</h3>
          <ul className="mt-2 list-disc pl-6 text-sm text-white/75">
            {eligibleWithNoCoordinates.map((entry) => (
              <li key={entry.offer.id}>
                <button
                  type="button"
                  aria-pressed={selectedOfferId === entry.offer.id}
                  className="rounded underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-emerald-300"
                  onClick={() => onSelect(entry.offer.id)}
                >
                  {entry.offer.name}
                </button>
                {" "}: prix ou CO₂e absent ou exprimé en intervalle. Choix possible avec limites explicites.
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {excluded.length > 0 ? (
        <div className="mt-5">
          <h3 className="font-semibold text-white">Offres non admissibles ou preuves insuffisantes</h3>
          <ul className="mt-2 list-disc pl-6 text-sm text-white/75">
            {excluded.map((entry) => (
              <li key={entry.offer.id}>{entry.offer.name} : {entry.eligibility}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {selected ? (
        <aside className="mt-5 rounded-xl border border-white/20 bg-black/20 p-4" aria-label="Détails de l'offre sélectionnée">
          <h3 className="font-semibold text-white">{selected.offer.name}</h3>
          <dl className="mt-2 grid gap-2 text-sm text-white/80 sm:grid-cols-2">
            <div><dt className="text-white/60">Modèle / version</dt><dd>{selected.offer.modelId} / {selected.offer.modelVersion}</dd></div>
            <div><dt className="text-white/60">Opérateur / déploiement</dt><dd>{selected.offer.providerId} / {selected.offer.deploymentId}</dd></div>
            <div><dt className="text-white/60">Environnement et poids</dt><dd>{selected.offer.executionEnvironment} / {selected.offer.weightsAvailability}</dd></div>
            <div><dt className="text-white/60">Traitement physique</dt><dd>{selected.offer.campaign.operationalCarbon?.location ?? "UNKNOWN"}</dd></div>
            <div><dt className="text-white/60">Coût complet</dt><dd>{formatRange(selected.priceEuroPerSuccess, 6, "€/tâche réussie")}</dd></div>
            <div><dt className="text-white/60">Électricité</dt><dd>{formatRange(selected.energyWhPerSuccess, 3, "Wh/tâche réussie")}</dd></div>
            <div><dt className="text-white/60">CO₂e opérationnel location-based</dt><dd>{formatRange(selected.carbonGramsCo2ePerSuccess, 3, "gCO₂e/tâche réussie")}</dd></div>
            <div><dt className="text-white/60">Mode commercial</dt><dd>{selected.offer.access.billingMode}</dd></div>
            <div><dt className="text-white/60">Plateformes utilisables</dt><dd>{selected.offer.access.codingPlatformIds.join(", ") || "NA"}</dd></div>
            <div><dt className="text-white/60">Forfait</dt><dd>{selected.offer.access.subscriptionPlanId ?? "Non applicable"}</dd></div>
            <div><dt className="text-white/60">Méthode de tarification</dt><dd>{selected.offer.campaign.price?.method ?? "NA"}</dd></div>
            <div><dt className="text-white/60">Raisonnement évalué</dt><dd>{selected.offer.access.reasoningConfigurationId || "NA"}</dd></div>
            <div><dt className="text-white/60">Évaluation de code</dt><dd>{selected.offer.codingAssessment
              ? `${selected.offer.codingAssessment.benchmarkId} : ${formatRange(selected.offer.codingAssessment.successRate, 3, "taux de réussite")}`
              : "NA"}</dd></div>
            <div><dt className="text-white/60">Éligibilité</dt><dd>{selected.eligibility}</dd></div>
            <div><dt className="text-white/60">Preuves vérifiées le</dt><dd>{selected.offer.evidence.checkedAt}</dd></div>
          </dl>
          {selected.warnings.length > 0 ? (
            <p className="mt-3 text-xs text-amber-200">Limites : {selected.warnings.join(", ")}</p>
          ) : null}
          {selected.offer.evidence.sourceUrls.length > 0 ? (
            <p className="mt-3 text-xs text-white/75">
              Preuves : {selected.offer.evidence.sourceUrls.map((url, index) => (
                <span key={url}>
                  {index > 0 ? " · " : ""}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    Source {index + 1}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </aside>
      ) : null}
      <p className="mt-5 text-xs text-white/60">
        Sélectionner une offre ne déclenche pas de requête externe ni de mutation.
        Le recalcul éventuel doit être explicitement confirmé dans le parcours personnel.
      </p>
    </section>
  );
}
