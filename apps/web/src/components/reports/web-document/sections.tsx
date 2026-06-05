"use client";

import Link from "next/link";
import Image from "next/image";
import { REPORT_SECTIONS, GLOSSARY_ROWS } from "./constants";
import { toFrInt, toFrNumber } from "./analytics";
import { GeoCoverageRing, InsightBox, MetricCard, MonthlyBars, ReportPage, ReportTable } from "./ui";
import type { ReportModel } from "./types";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import type { ReportAccountScopeCoverage } from "@/lib/reports/scope";

type WasteProfile = {
  categories: Array<{
    key: string;
    label: string;
    kg: number;
    actions: number;
  }>;
  coveragePercent: number;
  dominantLabel: string;
  dominantKg: number;
};

type ReportsWebSectionsProps = {
  report: ReportModel;
  activeScopeLabel: string;
  accountCoverage: ReportAccountScopeCoverage;
  wasteProfile: WasteProfile;
  weather: {
    current?: {
      temperature_2m?: number;
      precipitation?: number;
      wind_speed_10m?: number;
    };
  };
  weatherAdvice: string;
  isLoading: boolean;
  hasError: boolean;
};

function formatSourceLabel(key: string): string {
  if (key === "water") return "Eau";
  if (key === "co2") return "CO2";
  if (key === "surface") return "Surface";
  if (key === "roi") return "ROI";
  return key;
}

function buildSurfaceProxy(report: ReportModel): number {
  const factors = IMPACT_PROXY_CONFIG.factors;
  return (
    report.totals.kg * factors.surfaceM2PerWasteKg +
    report.totals.hours * 60 * factors.surfaceM2PerVolunteerMinute
  );
}

export function ReportsWebSections(props: ReportsWebSectionsProps) {
  const {
    report,
    activeScopeLabel,
    accountCoverage,
    wasteProfile,
    weather,
    weatherAdvice,
    isLoading,
    hasError,
  } = props;

  const [
    section1,
    section2,
    section3,
    section4,
    section5,
    section6,
    section7,
    section8,
    section9,
    section10,
    section11,
    section12,
  ] = REPORT_SECTIONS;

  if (
    !section1 ||
    !section2 ||
    !section3 ||
    !section4 ||
    !section5 ||
    !section6 ||
    !section7 ||
    !section8 ||
    !section9 ||
    !section10 ||
    !section11 ||
    !section12
  ) {
    return null;
  }

  const executive = report.executive as {
    summary: string;
    watchouts: string[];
    budgetUseCases: string[];
    readinessLabel: string;
    readinessScore: number;
    evidence: string[];
    headline: string;
  };
  const surfaceProxy = buildSurfaceProxy(report);

  return (
    <div className="space-y-8">
      <ReportPage {...section1}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Période analysée"
            value="12 mois glissants"
            hint={`Généré le ${report.generatedAt}`}
          />
          <MetricCard
            label="Territoire couvert"
            value={activeScopeLabel}
            tone="accent"
            hint="Périmètre actif"
          />
          <MetricCard
            label="Organisation ou collectif"
            value={activeScopeLabel === "Global" ? "Collectif CleanMyMap" : activeScopeLabel}
            hint="Lecture contextuelle"
          />
            <MetricCard
              label="Sources des données"
              value={`${Object.keys(report.impactMethodology.sources ?? {}).length} familles`}
              tone="accent"
              hint="Actions, carte, communauté, météo"
            />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Périmètre de lecture"
            lines={[
              `Fenêtre consolidée: ${report.generatedAt}.`,
              `Territoire actif: ${activeScopeLabel}.`,
              "Le rapport agrège les données validées, la cartographie d’action, les événements communauté et les proxys météo.",
            ]}
          />
        <ReportTable
          headers={["Source", "Rôle", "Statut"]}
          rows={Object.entries(report.impactMethodology.sources ?? {}).map(([key, value]) => [
            formatSourceLabel(key),
            value,
            "Documentée",
          ])}
          />
        </div>
      </ReportPage>

      <ReportPage {...section2}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Actions recensées" value={toFrInt(report.totals.actions)} />
          <MetricCard
            label="Déchets collectés"
            value={`${toFrNumber(report.totals.kg)} kg`}
            tone="accent"
          />
          <MetricCard label="Déchets signalés" value={toFrInt(report.terrain.spotCount)} />
          <MetricCard
            label="Participation bénévole"
            value={toFrInt(report.totals.volunteers)}
            tone="accent"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Zones traitées et zones restantes"
            lines={[
              `Zones traitées: ${toFrInt(report.areas.length)} zones cartographiées.`,
              `Couverture géographique: ${toFrNumber(report.map.geoCoverage)}%.`,
              `Zones restantes (proxy): ${toFrNumber(Math.max(0, 100 - report.map.geoCoverage))}% du périmètre cartographiable.`,
            ]}
          />
          <InsightBox
            title="Mobilisation terrain"
            lines={[
              `Bénévoles mobilisés: ${toFrInt(report.totals.volunteers)}.`,
              `Heures cumulées: ${toFrNumber(report.totals.hours)} h.`,
              `Actions terrain certifiées: ${toFrInt(report.terrain.actionCount)}.`,
            ]}
          />
        </div>
        <ReportTable
          headers={["Zone", "Actions", "Kg", "Mégots", "Récurrence"]}
          rows={report.areas.slice(0, 6).map((row) => [
            row.area,
            toFrInt(row.actions),
            toFrNumber(row.kg),
            toFrInt(row.butts),
            `${toFrNumber(row.recurrence, 1)}x`,
          ])}
        />
      </ReportPage>

      <ReportPage {...section3}>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Couverture GPS" value={`${toFrNumber(report.map.geoCoverage)}%`} />
          <MetricCard
            label="Traces / polylignes"
            value={`${toFrInt(report.map.traces)} / ${toFrInt(report.map.polylines)}`}
            tone="accent"
          />
          <MetricCard label="Taux de traces" value={`${toFrNumber(report.map.traceCoverage)}%`} />
          <MetricCard
            label="Évolution des signalements"
            value={`${report.trendPercent >= 0 ? "+" : ""}${toFrNumber(report.trendPercent)}%`}
            tone={report.trendPercent > 0 ? "danger" : "base"}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <GeoCoverageRing coveragePercent={report.map.geoCoverage} tracePercent={report.map.traceCoverage} />
          <InsightBox
            title="Lecture territoriale"
            lines={[
              `Zone la plus sensible: ${report.areas[0]?.area ?? "n/a"}.`,
              `Distance d’itinéraire recommandée: ${toFrNumber(report.routeDistance)} km.`,
              "Les zones prioritaires sont repérées à partir du cumul kg + mégots + récurrence.",
            ]}
          />
        </div>
        <MonthlyBars rows={report.monthRows6} />
        <ReportTable
          headers={["Zone", "Actions", "Kg", "Récurrence", "Score"]}
          rows={report.areas.slice(0, 8).map((row) => [
            row.area,
            toFrInt(row.actions),
            toFrNumber(row.kg),
            toFrNumber(row.recurrence, 1),
            toFrNumber(row.score, 1),
          ])}
        />
      </ReportPage>

      <ReportPage {...section4}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Impact estimé"
            value={`${toFrNumber(report.totals.kg)} kg`}
            hint="Base de proxy"
          />
          <MetricCard
            label="Émissions évitées"
            value={`${toFrNumber(report.climate.twelve.kg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg)} kg`}
            tone="accent"
            hint="Proxy CO2"
          />
          <MetricCard
            label="Eau préservée"
            value={`${toFrInt(report.climate.waterProtectedLiters)} L`}
            hint="Proxy mégots"
          />
          <MetricCard
            label="Surface d’action"
            value={`${toFrNumber(surfaceProxy)} m²`}
            tone="accent"
            hint="Poids + temps bénévoles"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Indice de pollution"
            lines={[
              `Score pollution moyen: ${toFrNumber(report.impactMethodology.pollutionScoreAverage)} / 100.`,
              `Indice de tri propre: ${toFrNumber(report.recycling.triIndex)} / 100.`,
              "Les indicateurs environnementaux sont des proxies de décision et non des mesures instrumentales.",
            ]}
          />
          <InsightBox
            title="Lecture opérationnelle"
            lines={[
              weatherAdvice,
              `Température: ${weather.current?.temperature_2m ?? "n/a"} °C`,
              `Précipitations: ${weather.current?.precipitation ?? "n/a"} mm`,
              `Vent: ${weather.current?.wind_speed_10m ?? "n/a"} km/h`,
            ]}
          />
        </div>
      </ReportPage>

      <ReportPage {...section5}>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            label="Typologie dominante"
            value={wasteProfile.dominantLabel}
            hint={`${toFrNumber(wasteProfile.dominantKg)} kg agrégés`}
          />
          <MetricCard
            label="Données typées"
            value={`${toFrNumber(wasteProfile.coveragePercent)}%`}
            tone="accent"
            hint="Actions avec breakdown"
          />
          <MetricCard
            label="Points de vigilance"
            value={toFrInt(report.areas.filter((row) => row.recurrence > 1).length)}
            hint="Zones récurrentes"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Contraintes du territoire"
            lines={[
              "La météo et la densité urbaine influencent la récurrence des dépôts.",
              "Les axes de passage et les franges de quartier restent les zones les plus sensibles.",
              "Le rapport doit être lu en tenant compte du périmètre actif et du niveau de couverture cartographique.",
            ]}
          />
          <InsightBox
            title="Besoins identifiés"
            lines={[
              "Renforcer les points de collecte sur les zones récurrentes.",
              "Consolider les traces géographiques sur les actions multi-segments.",
              "Mieux typiser les déchets dans les formulaires de terrain.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Déchet", "Kg", "Actions concernées"]}
          rows={
            wasteProfile.categories.length > 0
              ? wasteProfile.categories.map((category) => [
                  category.label,
                  toFrNumber(category.kg),
                  toFrInt(category.actions),
                ])
              : [["Aucune typologie exploitée", "-", "-"]]
          }
        />
      </ReportPage>

      <ReportPage {...section6}>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Mode de calcul"
            lines={[
              `Version proxy: ${report.impactMethodology.proxyVersion}.`,
              `Règles qualité: ${report.impactMethodology.qualityRulesVersion}.`,
              `Scope: ${report.impactMethodology.scope}`,
            ]}
          />
          <ReportTable
            headers={["Contrôle", "Valeur", "Lecture"]}
            rows={[
              ["Complétude", `${toFrNumber(report.quality.completenessScore)}%`, "Présence des champs clés"],
              ["Cohérence", `${toFrNumber(report.quality.coherenceScore)}%`, "Valeurs plausibles"],
              ["Fraîcheur médiane", `${toFrNumber(report.quality.freshnessDays)} j`, "Ancienneté médiane"],
              ["Géolocalisation", `${toFrNumber(report.quality.geolocRate)}%`, "Preuves spatiales"],
            ]}
          />
        </div>
        <ReportTable
          headers={["Formule", "Lecture", "Interprétation"]}
          rows={report.impactMethodology.formulas.map((formula) => [
            formula.label,
            formula.formula,
            formula.interpretation,
          ])}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <ReportTable
            headers={["Hypothèse", "Détail"]}
            rows={report.impactMethodology.hypotheses.map((item) => ["Hypothèse de calcul", item])}
          />
          <ReportTable
            headers={["Limite", "Valeur", "Nature"]}
            rows={[
              [
                "Eau sauvée",
                `+/- ${toFrNumber(report.impactMethodology.errorMargins.waterSavedLitersPct, 0)}%`,
                "Approximation",
              ],
              [
                "CO2 évité",
                `+/- ${toFrNumber(report.impactMethodology.errorMargins.co2AvoidedKgPct, 0)}%`,
                "Approximation",
              ],
              [
                "Surface nettoyée",
                `+/- ${toFrNumber(report.impactMethodology.errorMargins.surfaceCleanedM2Pct, 0)}%`,
                "Approximation",
              ],
              [
                "Score pollution moyen",
                `+/- ${toFrNumber(report.impactMethodology.errorMargins.pollutionScoreMeanPoints, 0)} pts`,
                "Incertitude de mesure",
              ],
            ]}
          />
        </div>
        <ReportTable
          headers={["Source", "Description"]}
          rows={Object.entries(report.impactMethodology.sources ?? {}).map(([key, value]) => [
            formatSourceLabel(key),
            value,
          ])}
        />
      </ReportPage>

      <ReportPage {...section7}>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Événements créés" value={toFrInt(report.community.totalEvents)} />
          <MetricCard label="À venir" value={toFrInt(report.community.upcomingEvents)} tone="accent" />
          <MetricCard label="Passés" value={toFrInt(report.community.pastEvents)} />
          <MetricCard
            label="Taux RSVP oui"
            value={`${toFrNumber(report.community.participationRate)}%`}
            tone="accent"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ReportTable
            headers={["Indicateur", "Valeur", "Lecture"]}
            rows={[
              [
                "RSVP oui / maybe / non",
                `${toFrInt(report.community.rsvp.yes)} / ${toFrInt(report.community.rsvp.maybe)} / ${toFrInt(report.community.rsvp.no)}`,
                "Engagement événementiel",
              ],
              [
                "Badges confirmés (5+)",
                toFrInt(report.community.badgeConfirmed),
                "Progression régulière",
              ],
              [
                "Badges experts (10+)",
                toFrInt(report.community.badgeExpert),
                "Noyau bénévole",
              ],
              [
                "Répartition citoyen/asso/institution",
                `${toFrInt(report.community.sourceBuckets.citoyen)} / ${toFrInt(report.community.sourceBuckets.associatif)} / ${toFrInt(report.community.sourceBuckets.institutionnel)}`,
                "Équilibre de l’écosystème",
              ],
            ]}
          />
          <InsightBox
            title="Dynamique collective"
            lines={[
              "Les événements structurent la mobilisation et servent de point d’entrée pour les nouveaux bénévoles.",
              "Les partenaires associatifs et institutionnels renforcent la capacité de passage à l’échelle.",
              "La contribution citoyenne reste la base de diffusion la plus large.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Rang", "Contributeur", "Actions", "Kg", "Mégots"]}
          rows={
            report.community.topLeaderboard.length > 0
              ? report.community.topLeaderboard.map((entry, index) => [
                  `#${index + 1}`,
                  entry.name,
                  toFrInt(entry.actions),
                  toFrNumber(entry.kg),
                  toFrInt(entry.butts),
                ])
              : [["-", "Aucune donnée", "0", "0", "0"]]
          }
        />
      </ReportPage>

      <ReportPage {...section8}>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Validation des données"
            lines={[
              `Conversion de modération: ${toFrNumber(report.moderation.conversion)}%.`,
              `Délai moyen de traitement: ${toFrNumber(report.moderation.delayDays)} j.`,
              `Couverture compte sur created_by_clerk_id: ${toFrNumber(accountCoverage.coveragePercent)}%.`,
            ]}
          />
          <InsightBox
            title="Protection des données"
            lines={[
              accountCoverage.hasMeasurableBase
                ? `${accountCoverage.missingCreatedByClerkId} entrée(s) restent sans clé stable.`
                : "Données insuffisantes pour mesurer la couverture compte.",
              "Les données publiques évitent les champs sensibles inutiles et conservent une traçabilité de génération.",
              "Les exports et la diffusion externe restent bornés aux champs nécessaires au pilotage.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Contrôle", "Valeur", "Lecture"]}
          rows={[
            ["Pending", toFrInt(report.moderation.pending), "En attente de validation"],
            ["Approved", toFrInt(report.moderation.approved), "Données publiables"],
            ["Rejected", toFrInt(report.moderation.rejected), "Données non retenues"],
            ["Fraîcheur", `${toFrNumber(report.quality.freshnessDays)} j`, "Temporalité du signal"],
          ]}
        />
        <ReportTable
          headers={["Traçabilité", "Source", "Statut"]}
          rows={Object.entries(report.impactMethodology.sources ?? {}).map(([key, value]) => [
            formatSourceLabel(key),
            value,
            "Documentée",
          ])}
        />
      </ReportPage>

      <ReportPage {...section9}>
        <div className="grid gap-3 md:grid-cols-3">
          <InsightBox title="Actions à court terme" lines={executive.budgetUseCases.slice(0, 1)} />
          <InsightBox
            title="Actions à moyen terme"
            lines={[
              "Stabiliser les zones récurrentes avec un rythme de collecte plus serré.",
              "Typiser davantage les déchets pour fiabiliser les tendances locales.",
            ]}
          />
          <InsightBox
            title="Priorités territoriales"
            lines={[
              report.areas[0] ? `Zone prioritaire: ${report.areas[0].area}.` : "Aucune zone prioritaire identifiée.",
              "Renforcer la cartographie sur les zones à récurrence forte.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Recommandation", "Pourquoi", "Effet attendu"]}
          rows={executive.budgetUseCases.map((line, index) => [
            line,
            index === 0 ? "Décision et financement" : index === 1 ? "Terrain" : "Diffusion",
            index === 0 ? "Arbitrage plus rapide" : index === 1 ? "Traitement plus ciblé" : "Crédibilité renforcée",
          ])}
        />
      </ReportPage>

      <ReportPage {...section10}>
        <ReportTable headers={["Sprint", "Période", "Objectif principal", "Responsables"]} rows={report.calendar} />
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Objectifs de suivi"
            lines={[
              "Suivre la complétude des données avant toute diffusion institutionnelle.",
              "Vérifier la couverture cartographique et le taux de traces géométriques.",
            ]}
          />
          <InsightBox
            title="Échéances recommandées"
            lines={[
              "Court terme: consolidation data + modération.",
              "Moyen terme: renfort terrain et priorisation des zones récurrentes.",
            ]}
          />
        </div>
      </ReportPage>

      <ReportPage {...section11}>
        <ReportTable headers={["Terme", "Définition claire"]} rows={GLOSSARY_ROWS.map((row) => [...row])} />
      </ReportPage>

      <ReportPage {...section12}>
        <div className="grid gap-3 md:grid-cols-2">
          <ReportTable
            headers={["Section", "Donnée clé", "Usage"]}
            rows={[
              [
                "Pilotage",
                `${toFrInt(report.totals.actions)} actions / ${toFrNumber(report.totals.kg)} kg`,
                "Arbitrage de priorités et suivi des performances",
              ],
              [
                "Terrain",
                `${toFrNumber(report.routeDistance)} km de circuit recommandé`,
                "Préparation opérationnelle des équipes",
              ],
              [
                "Contexte",
                `${toFrInt(report.climate.waterProtectedLiters)} L eau protégée (proxy)`,
                "Plaidoyer et communication institutionnelle",
              ],
              [
                "Communauté",
                `${toFrInt(report.community.totalEvents)} événements`,
                "Activation réseau bénévole et partenaires",
              ],
            ]}
          />
          <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <h3 className="cmm-text-small font-semibold cmm-text-primary">Liens d’action immédiate</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/actions/new"
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 cmm-text-small font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Déclarer une action
              </Link>
              <Link
                href="/actions/map"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
              >
                Ouvrir la carte
              </Link>
              <Link
                href="/actions/history"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
              >
                Historique valide
              </Link>
              <a
                href="#synthese-executive"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
              >
                Retour au sommaire
              </a>
            </div>
            <p className="mt-3 cmm-text-caption cmm-text-muted">
              Les exports CSV/JSON et la modération admin restent disponibles dans le panneau
              opérationnel en bas de page.
            </p>
          </article>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {report.highlightPhotos.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="cmm-text-small font-semibold cmm-text-primary">Cartes complémentaires</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {report.highlightPhotos.slice(0, 4).map((photo) => (
                  <figure key={`${photo.label}-${photo.date}`} className="overflow-hidden rounded-xl border border-slate-200">
                    <Image
                      src={photo.url}
                      alt={photo.label}
                      width={800}
                      height={450}
                      unoptimized
                      className="h-36 w-full object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <figcaption className="bg-white p-2 cmm-text-caption cmm-text-secondary">
                      <span className="block font-semibold cmm-text-primary">{photo.label}</span>
                      <span className="block">{photo.date}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 cmm-text-small cmm-text-secondary">
              Aucune photo certifiée disponible pour ce périmètre.
            </div>
          )}
          <ReportTable
            headers={["Zone", "Actions", "Kg", "Mégots", "Recurrence"]}
            rows={report.annualRows.length > 0 ? report.annualRows : [["n/a", "0", "0", "0", "0"]]}
          />
        </div>
      </ReportPage>

      {isLoading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-3 cmm-text-small cmm-text-muted">
          Mise à jour du rapport web en cours...
        </p>
      ) : null}
      {hasError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 cmm-text-small text-red-700">
          Certaines sources n’ont pas pu être chargées. Le rapport reste visible avec les données
          disponibles.
        </p>
      ) : null}
    </div>
  );
}
