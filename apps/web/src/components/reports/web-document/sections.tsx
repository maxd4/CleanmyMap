"use client";

import Link from "next/link";
import { CHAPTERS, GLOSSARY_ROWS } from "./constants";
import { toFrInt, toFrNumber } from "./analytics";
import { GeoCoverageRing, InsightBox, MetricCard, MonthlyBars, ReportPage, ReportTable } from "./ui";
import type { ReportModel } from "./types";

type ReportsWebSectionsProps = {
  report: ReportModel;
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

export function ReportsWebSections(props: ReportsWebSectionsProps) {
  const { report, weather, weatherAdvice, isLoading, hasError } = props;

  return (
    <div className="space-y-8">
      <ReportPage {...CHAPTERS[0]}>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Lecture terrain"
            lines={[
              "Priorites operationnelles, itineraires, meteo et checklists lisibles en moins de 2 minutes.",
              "Zones a traiter, volumes estimes et points de vigilance directement exploitables.",
            ]}
          />
          <InsightBox
            title="Lecture decideur"
            lines={[
              "KPI consolides, qualite des donnees, tendances et priorisation territoriale.",
              "Bloc gouvernance + annexes pour arbitrage budgetaire et diffusion institutionnelle.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Partie", "Objectif", "Public principal"]}
          rows={CHAPTERS.slice(1).map((chapter) => [
            chapter.title,
            chapter.subtitle,
            chapter.audience === "terrain"
              ? "Benevoles"
              : chapter.audience === "strategie"
                ? "Decideurs"
                : "Mixte",
          ])}
        />
      </ReportPage>

      <ReportPage {...CHAPTERS[1]}>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            label="Actions validees"
            value={toFrInt(report.totals.actions)}
            hint="Perimetre: 12 derniers mois"
          />
          <MetricCard label="Volume collecte" value={`${toFrNumber(report.totals.kg)} kg`} tone="accent" />
          <MetricCard label="Megots retires" value={toFrInt(report.totals.butts)} tone="accent" />
          <MetricCard label="Benevoles mobilises" value={toFrInt(report.totals.volunteers)} />
          <MetricCard label="Heures benevoles" value={`${toFrNumber(report.totals.hours)} h`} />
          <MetricCard
            label="Tendance 30j"
            value={`${report.trendPercent >= 0 ? "+" : ""}${toFrNumber(report.trendPercent)}%`}
            hint="vs periode precedente"
            tone={report.trendPercent > 0 ? "danger" : "base"}
          />
        </div>
        <MonthlyBars rows={report.monthRows6} />
      </ReportPage>

      <ReportPage {...CHAPTERS[2]}>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Pending" value={toFrInt(report.moderation.pending)} />
          <MetricCard label="Approved" value={toFrInt(report.moderation.approved)} />
          <MetricCard label="Rejected" value={toFrInt(report.moderation.rejected)} />
          <MetricCard
            label="Conversion moderation"
            value={`${toFrNumber(report.moderation.conversion)}%`}
            tone="accent"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Qualite de donnees"
            lines={[
              `Completude: ${toFrNumber(report.quality.completenessScore)}%`,
              `Coherence: ${toFrNumber(report.quality.coherenceScore)}%`,
              `Fraicheur mediane: ${toFrNumber(report.quality.freshnessDays)} jours`,
              `Taux de geolocalisation: ${toFrNumber(report.quality.geolocRate)}%`,
            ]}
          />
          <InsightBox
            title="Priorites decisionnelles"
            lines={[
              "Cibler en priorite les 3 zones avec score de recurrence le plus eleve.",
              "Stabiliser un delai de moderation court pour fiabiliser la publication.",
              "Exploiter la tendance glissante 30 jours pour arbitrage hebdomadaire.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Zone", "Actions", "Kg", "Recurrence", "Score"]}
          rows={report.areas.slice(0, 8).map((row) => [
            row.area,
            toFrInt(row.actions),
            toFrNumber(row.kg),
            toFrInt(row.recurrence),
            toFrNumber(row.score),
          ])}
        />
      </ReportPage>

      <ReportPage {...CHAPTERS[3]}>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Actions terrain" value={toFrInt(report.terrain.actionCount)} />
          <MetricCard label="Spots signales" value={toFrInt(report.terrain.spotCount)} />
          <MetricCard label="Lieux propres" value={toFrInt(report.terrain.cleanPlaceCount)} />
          <MetricCard label="Distance itineraire" value={`${toFrNumber(report.routeDistance)} km`} tone="accent" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <GeoCoverageRing coveragePercent={report.map.geoCoverage} tracePercent={report.map.traceCoverage} />
          <InsightBox
            title="Recommandations operationnelles"
            lines={[
              "Passer en priorite par les etapes a score kg+megots le plus eleve.",
              "Capturer une trace/polygone quand l'action couvre plusieurs segments.",
              "Documenter les zones de tri des la collecte pour accelerer la valorisation.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Etape", "Zone", "Kg", "Megots", "Segment", "Navigation"]}
          rows={
            report.routeSteps.length > 0
              ? report.routeSteps.map((step) => [
                  `#${step.index}`,
                  step.label,
                  `${toFrNumber(step.kg)} kg`,
                  toFrInt(step.butts),
                  `${toFrNumber(step.segmentKm)} km`,
                  `${toFrNumber(step.latitude, 4)}, ${toFrNumber(step.longitude, 4)}`,
                ])
              : [["-", "Aucune etape calculable", "-", "-", "-", "-"]]
          }
        />
      </ReportPage>

      <ReportPage {...CHAPTERS[4]}>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="6 mois - actions" value={toFrInt(report.climate.six.actions)} />
          <MetricCard label="6 mois - kg" value={`${toFrNumber(report.climate.six.kg)} kg`} />
          <MetricCard label="12 mois - actions" value={toFrInt(report.climate.twelve.actions)} />
          <MetricCard label="12 mois - kg" value={`${toFrNumber(report.climate.twelve.kg)} kg`} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Impacts estimes"
            lines={[
              `Eau potentiellement protegee: ${toFrInt(report.climate.waterProtectedLiters)} L`,
              `CO2e evite (proxy): ${toFrNumber(report.climate.co2AvoidedKg)} kg`,
              `Indice de tri propre: ${toFrNumber(report.recycling.triIndex)} / 100`,
              `Volume triable (proxy): ${toFrNumber(report.recycling.recyclableKg)} kg`,
            ]}
          />
          <InsightBox
            title="Meteo operationnelle"
            lines={[
              weatherAdvice,
              `Temperature: ${weather.current?.temperature_2m ?? "n/a"} °C`,
              `Precipitations: ${weather.current?.precipitation ?? "n/a"} mm`,
              `Vent: ${weather.current?.wind_speed_10m ?? "n/a"} km/h`,
            ]}
          />
        </div>
        <ReportTable
          headers={["Zone", "Actions", "Kg", "Megots", "Kg/action"]}
          rows={report.annualRows.length > 0 ? report.annualRows : [["n/a", "0", "0", "0", "0"]]}
        />
      </ReportPage>

      <ReportPage {...CHAPTERS[5]}>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Evenements crees" value={toFrInt(report.community.totalEvents)} />
          <MetricCard label="A venir" value={toFrInt(report.community.upcomingEvents)} />
          <MetricCard label="Passes" value={toFrInt(report.community.pastEvents)} />
          <MetricCard label="Taux RSVP oui" value={`${toFrNumber(report.community.participationRate)}%`} tone="accent" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ReportTable
            headers={["Indicateur", "Valeur", "Lecture"]}
            rows={[
              [
                "RSVP oui / maybe / non",
                `${toFrInt(report.community.rsvp.yes)} / ${toFrInt(report.community.rsvp.maybe)} / ${toFrInt(report.community.rsvp.no)}`,
                "Niveau d'engagement des evenements",
              ],
              [
                "Badges confirmes (5+)",
                toFrInt(report.community.badgeConfirmed),
                "Progression reguliere des contributeurs",
              ],
              [
                "Badges experts (10+)",
                toFrInt(report.community.badgeExpert),
                "Noyau benevole structurant",
              ],
              [
                "Repartition citoyen/asso/institution",
                `${toFrInt(report.community.sourceBuckets.citoyen)} / ${toFrInt(report.community.sourceBuckets.associatif)} / ${toFrInt(report.community.sourceBuckets.institutionnel)}`,
                "Equilibre de l'ecosysteme",
              ],
            ]}
          />
          <InsightBox
            title="Actions recommandees"
            lines={[
              "Caler les campagnes terrain sur les evenements a plus fort RSVP oui.",
              "Rendre les paliers de badges visibles dans les parcours benevoles.",
              "Activer des partenariats commercants/entreprises sur les zones de recurrence.",
            ]}
          />
        </div>
        <ReportTable
          headers={["Rang", "Contributeur", "Actions", "Kg", "Megots"]}
          rows={
            report.community.topLeaderboard.length > 0
              ? report.community.topLeaderboard.map((entry, index) => [
                  `#${index + 1}`,
                  entry.name,
                  toFrInt(entry.actions),
                  toFrNumber(entry.kg),
                  toFrInt(entry.butts),
                ])
              : [["-", "Aucune donnee", "0", "0", "0"]]
          }
        />
      </ReportPage>

      <ReportPage {...CHAPTERS[6]}>
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Encadre methodologie"
            lines={[
              "Sources: actions validees, carte, evenements communaute, meteo operationnelle.",
              "Definitions: les KPI sont recalcules en direct sur la fenetre de donnees affichee.",
              `Version proxy: ${report.impactMethodology.proxyVersion} | Regles qualite: ${report.impactMethodology.qualityRulesVersion}.`,
              `Score pollution moyen: ${toFrNumber(report.impactMethodology.pollutionScoreAverage)} / 100.`,
              "Regle qualite: publication externe recommandee seulement si completude > 85%.",
            ]}
          />
          <ReportTable
            headers={["Version", "Date", "Perimetre", "Auteur"]}
            rows={[
              [
                "v3.0 web-report",
                report.generatedAt,
                "Rubrique reports (web native exhaustive)",
                "Equipe CleanMyMap",
              ],
              ["v2.x PDF", "Pipeline back-office", "Rapport PDF institutionnel", "Equipe data"],
            ]}
          />
        </div>
        <ReportTable
          headers={["Mesure", "Formule", "Interpretation"]}
          rows={report.impactMethodology.formulas.map((formula) => [
            formula.label,
            formula.formula,
            formula.interpretation,
          ])}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <ReportTable
            headers={["Hypothese", "Detail"]}
            rows={report.impactMethodology.hypotheses.map((item) => [
              "Hypothese de calcul",
              item,
            ])}
          />
          <ReportTable
            headers={["Marge d'erreur", "Valeur", "Nature"]}
            rows={[
              [
                "Eau sauvee (proxy)",
                `+/- ${toFrNumber(report.impactMethodology.errorMargins.waterSavedLitersPct, 0)}%`,
                "Approximation",
              ],
              [
                "CO2 evite (proxy)",
                `+/- ${toFrNumber(report.impactMethodology.errorMargins.co2AvoidedKgPct, 0)}%`,
                "Approximation",
              ],
              [
                "Surface nettoyee (proxy)",
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
          headers={["Controle", "Valeur", "Interpretation"]}
          rows={[
            ["Completude", `${toFrNumber(report.quality.completenessScore)}%`, "Presence des champs cles"],
            ["Coherence", `${toFrNumber(report.quality.coherenceScore)}%`, "Valeurs plausibles et non negatives"],
            ["Fraicheur mediane", `${toFrNumber(report.quality.freshnessDays)} j`, "Delai median entre action et consultation"],
            ["Geolocalisation", `${toFrNumber(report.quality.geolocRate)}%`, "Taux de preuves spatiales exploitables"],
            ["Delai moderation moyen", `${toFrNumber(report.moderation.delayDays)} j`, "Vitesse de publication validee"],
          ]}
        />
      </ReportPage>

      <ReportPage {...CHAPTERS[7]}>
        <ReportTable
          headers={["Sprint", "Periode", "Objectif principal", "Responsables"]}
          rows={report.calendar}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <InsightBox
            title="Lecture benevoles"
            lines={[
              "Sprint 2 priorise la lisibilite des zones, parcours et checklists operationnelles.",
              "Sprint 4 diffuse les bonnes pratiques pour montee en charge nationale.",
            ]}
          />
          <InsightBox
            title="Lecture decideurs"
            lines={[
              "Sprint 1 securise la fiabilite data avant tout arbitrage public.",
              "Sprint 3 structure la preuve d'impact pour les budgets et infrastructures environnementales.",
            ]}
          />
        </div>
      </ReportPage>

      <ReportPage {...CHAPTERS[8]}>
        <ReportTable
          headers={["Terme", "Definition claire"]}
          rows={GLOSSARY_ROWS.map((row) => [...row])}
        />
      </ReportPage>

      <ReportPage {...CHAPTERS[9]}>
        <div className="grid gap-3 md:grid-cols-2">
          <ReportTable
            headers={["Bloc", "Donnee cle", "Usage"]}
            rows={[
              [
                "Pilotage",
                `${toFrInt(report.totals.actions)} actions / ${toFrNumber(report.totals.kg)} kg`,
                "Arbitrage de priorites et suivi des performances",
              ],
              ["Terrain", `${toFrNumber(report.routeDistance)} km de circuit recommande`, "Preparation operationnelle des equipes"],
              [
                "Contexte",
                `${toFrInt(report.climate.waterProtectedLiters)} L eau protegee (proxy)`,
                "Plaidoyer et communication institutionnelle",
              ],
              ["Communaute", `${toFrInt(report.community.totalEvents)} evenements`, "Activation reseau benevole et partenaires"],
            ]}
          />
          <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <h3 className="text-sm font-semibold text-slate-900">Liens d&apos;action immediate</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/actions/new"
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Declarer une action
              </Link>
              <Link
                href="/actions/map"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Ouvrir la carte
              </Link>
              <Link
                href="/actions/history"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Historique valide
              </Link>
              <a
                href="#sommaire"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Retour au sommaire
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Les exports CSV/JSON et la moderation admin restent disponibles dans le panneau operationnel en bas
              de page.
            </p>
          </article>
        </div>
      </ReportPage>

      {isLoading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
          Mise a jour du rapport web en cours...
        </p>
      ) : null}
      {hasError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Certaines sources n&apos;ont pas pu etre chargees. Le rapport reste visible avec les donnees disponibles.
        </p>
      ) : null}
    </div>
  );
}
