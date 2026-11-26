import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { buildActionImpactMethodology } from "@/lib/actions/impact-calculators";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";
import { buildReportDataAvailabilityNotices } from "@/lib/reports/data-availability";

export function PublishedDecisionScope({ overview, locale = "fr" }: { overview: Pick<PilotageOverview, "periodDays" | "generatedAt" | "comparison" | "dataAvailability">; locale?: "fr" | "en" }) {
  const isEn = locale === "en";
  return <CmmCard size="sm" className="space-y-1">
    <p className="font-semibold cmm-text-primary">{isEn ? `Whole platform · ${overview.periodDays} days` : `Plateforme entière · ${overview.periodDays} jours`}</p>
    <p className="text-sm cmm-text-secondary">{isEn ? `${overview.comparison.current.approvedActions} completed public actions in period · computed on ${new Date(overview.generatedAt).toLocaleString("en-GB")}` : `${overview.comparison.current.approvedActions} actions publiques terminées dans la période · calculé le ${new Date(overview.generatedAt).toLocaleString("fr-FR")}`}</p>
    {buildReportDataAvailabilityNotices(overview.dataAvailability, locale).map(notice => <p key={notice} role="status" className="text-sm cmm-text-warning">{notice}</p>)}
  </CmmCard>;
}

const ZONE_URGENCY_EN = {
  critique: "critical",
  elevee: "high",
  moderee: "moderate",
} as const;

const ZONE_TEXT_EN: Record<string, string> = {
  "Pression territoriale forte avec progression d'impact sur la periode courante.":
    "High territorial pressure with rising impact over the current period.",
  "Zone a surveiller: hausse d'activite et score territorial au-dessus de la moyenne.":
    "Area to watch: increased activity and territorial score above average.",
  "Zone stable, suivi de fond recommande.":
    "Stable area, ongoing background monitoring recommended.",
  "Declencher une campagne ciblee sous 7 jours avec renfort moderation/geotrace.":
    "Launch a targeted campaign within 7 days with moderation and geotrace support.",
  "Planifier une intervention ciblee et renforcer la preuve geolocalisee.":
    "Schedule a targeted intervention and strengthen geolocated evidence.",
  "Maintenir la surveillance mensuelle et corriger les signaux de qualite faibles.":
    "Maintain monthly monitoring and fix low data-quality signals.",
  "Corpus partiel ou tronque : comparatif territorial non evaluable, suivi descriptif uniquement.":
    "Partial or truncated dataset: territorial comparison cannot be evaluated, descriptive tracking only.",
  "Verifier la disponibilite des donnees avant arbitrage territorial.":
    "Check data availability before territorial arbitration.",
  "Aucune action approuvee sur la periode courante (activite uniquement sur la periode precedente).":
    "No approved actions in the current period (activity only in the previous period).",
  "Maintenir la veille territoriale sans declencher d'urgence courante.":
    "Maintain territorial watch without triggering a current urgency.",
};

function buildLocalizedMethod(
  method: PilotageOverview["methods"][number],
  locale: "fr" | "en",
): PilotageOverview["methods"][number] {
  if (locale !== "en") return method;
  const impact = buildActionImpactMethodology();
  const enById: Record<string, { kpi: string; formula: string; source: string; recalc: string; limits: string }> = {
    "impact-volume": {
      kpi: "Field impact (kg)",
      formula: `Sum of ${impact.formulas.wasteKg} across approved actions in the window.`,
      source: `Canonical calculator ${impact.version}. Declared value with fallback estimation; proxy sources: ${impact.sources.co2}`,
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Declarative or estimated value depending on available data; not an instrumental measurement.",
    },
    mobilization: {
      kpi: "Mobilization",
      formula: `Sum of ${impact.formulas.volunteers} across approved actions in the window.`,
      source: "volunteersCount fields from valid declarations.",
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Declarative measure, sensitive to missing entries and not a count of unique people.",
    },
    "field-load": {
      kpi: "Field load",
      formula: "Sum of effectiveVolunteerUnits x durationMinutes on approved actions, with historical volunteersCount fallback.",
      source: "Derived child/adult/senior categories and durationMinutes from valid declarations.",
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Useful intensity proxy, not actual intervention duration.",
    },
    "place-context": {
      kpi: "Place context",
      formula: "Share of actions with placeType reported and distribution by place type.",
      source: "placeType field on valid actions.",
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Depends on the precision of field entries.",
    },
    "route-profile": {
      kpi: "Route profile",
      formula: "Share of actions with routeStyle and routeAdjustmentMessage reported.",
      source: "routeStyle and routeAdjustmentMessage fields on valid actions.",
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Describes declarative intent rather than the final GPS track.",
    },
    "quality-score": {
      kpi: "Data quality",
      formula: "Average quality score in % (completeness, consistency, geolocation, trace, freshness).",
      source: "Centralized evaluateActionQuality engine.",
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Decision-support score, not an exhaustive audit.",
    },
    coverage: {
      kpi: "Geo-coverage",
      formula: "(valid geolocated actions / approved actions) x 100.",
      source: "Latitude/longitude in the unified source.",
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Valid coordinates without a detailed trace may overestimate coverage.",
    },
    "moderation-delay": {
      kpi: "Moderation delay",
      formula: "Median age (days) of pending actions.",
      source: "createdAt/importedAt of pending records.",
      recalc: "Triggered on overview refresh. Server cache up to 10 min for reports/pilotage.",
      limits: "Sensitive to batch imports and historical backfills.",
    },
  };
  const localized = enById[method.id];
  return localized ? { id: method.id, ...localized } : method;
}

export function PublishedDecisionZones({ zones, locale = "fr" }: { zones: PilotageOverview["zones"]; locale?: "fr" | "en" }) {
  const isEn = locale === "en";
  return <section className="space-y-3"><h2 className="text-xl font-bold cmm-text-primary">{isEn ? "Observed zones" : "Zones observées"}</h2>
    {zones.length === 0 ? <CmmCard><p className="text-sm cmm-text-secondary">{isEn ? "No zones in the loaded results." : "Aucune zone dans les résultats chargés."}</p></CmmCard> : <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {zones.map(zone => <CmmCard key={zone.area} className="space-y-3">
        <h3 className="font-bold cmm-text-primary">{zone.area}</h3>
        <p className="text-sm cmm-text-secondary">{isEn ? "Score" : "Score"} : {zone.normalizedScore.toFixed(1)} · {isEn ? ZONE_URGENCY_EN[zone.urgency] : zone.urgency}</p>
        <p className="text-sm cmm-text-secondary">{zone.currentActions} actions · {zone.currentWasteCoverageRate === 0 ? (isEn ? "mass not reported" : "masse non renseignée") : (isEn ? `${zone.currentKg} kg reported` : `${zone.currentKg} kg renseignés`)}</p>
        <p className="text-sm cmm-text-secondary">{isEn ? (ZONE_TEXT_EN[zone.justification] ?? zone.justification) : zone.justification}</p><p className="font-semibold cmm-text-primary">{isEn ? (ZONE_TEXT_EN[zone.recommendedAction] ?? zone.recommendedAction) : zone.recommendedAction}</p>
      </CmmCard>)}
    </div>}
    <CmmButton href="/actions/map" tone="secondary">{isEn ? "Explore the map" : "Explorer la carte"}</CmmButton>
  </section>;
}

export function PublishedDecisionMethods({ methods, locale = "fr" }: { methods: PilotageOverview["methods"]; locale?: "fr" | "en" }) {
  const isEn = locale === "en";
  return <section className="space-y-3"><h2 className="text-xl font-bold cmm-text-primary">{isEn ? "Methods and limits" : "Méthodes et limites"}</h2>
    {methods.map(method => {
      const localized = buildLocalizedMethod(method, locale);
      return <CmmCard key={method.id}><details className="space-y-3"><summary className="cursor-pointer font-semibold cmm-text-primary">{localized.kpi}</summary>
        <dl className="space-y-2 text-sm cmm-text-secondary">{[[isEn ? "Formula" : "Formule", localized.formula], [isEn ? "Source" : "Source", localized.source], [isEn ? "Frequency" : "Fréquence", localized.recalc], [isEn ? "Limits" : "Limites", localized.limits]].map(([name,value]) => <div key={name}><dt className="font-bold cmm-text-primary">{name}</dt><dd className="break-words">{value}</dd></div>)}</dl>
      </details></CmmCard>;
    })}
    <div className="flex flex-wrap gap-2"><CmmButton href="/methodologie" tone="secondary">{isEn ? "Scientific protocol" : "Protocole scientifique"}</CmmButton><CmmButton href="/reports" tone="primary">{isEn ? "Reports and exports" : "Rapports et exports"}</CmmButton></div>
  </section>;
}
