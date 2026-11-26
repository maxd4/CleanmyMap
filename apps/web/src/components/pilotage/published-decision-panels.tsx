import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
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

export function PublishedDecisionZones({ zones, locale = "fr" }: { zones: PilotageOverview["zones"]; locale?: "fr" | "en" }) {
  const isEn = locale === "en";
  return <section className="space-y-3"><h2 className="text-xl font-bold cmm-text-primary">{isEn ? "Observed zones" : "Zones observées"}</h2>
    {zones.length === 0 ? <CmmCard><p className="text-sm cmm-text-secondary">{isEn ? "No zones in the loaded results." : "Aucune zone dans les résultats chargés."}</p></CmmCard> : <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {zones.map(zone => <CmmCard key={zone.area} className="space-y-3">
        <h3 className="font-bold cmm-text-primary">{zone.area}</h3>
        <p className="text-sm cmm-text-secondary">{isEn ? "Score" : "Score"} : {zone.normalizedScore.toFixed(1)} · {zone.urgency}</p>
        <p className="text-sm cmm-text-secondary">{zone.currentActions} actions · {zone.currentWasteCoverageRate === 0 ? (isEn ? "mass not reported" : "masse non renseignée") : (isEn ? `${zone.currentKg} kg reported` : `${zone.currentKg} kg renseignés`)}</p>
        <p className="text-sm cmm-text-secondary">{zone.justification}</p><p className="font-semibold cmm-text-primary">{zone.recommendedAction}</p>
      </CmmCard>)}
    </div>}
    <CmmButton href="/actions/map" tone="secondary">{isEn ? "Explore the map" : "Explorer la carte"}</CmmButton>
  </section>;
}

export function PublishedDecisionMethods({ methods, locale = "fr" }: { methods: PilotageOverview["methods"]; locale?: "fr" | "en" }) {
  const isEn = locale === "en";
  return <section className="space-y-3"><h2 className="text-xl font-bold cmm-text-primary">{isEn ? "Methods and limits" : "Méthodes et limites"}</h2>
    {methods.map(method => <CmmCard key={method.id}><details className="space-y-3"><summary className="cursor-pointer font-semibold cmm-text-primary">{method.kpi}</summary>
      <dl className="space-y-2 text-sm cmm-text-secondary">{[[isEn ? "Formula" : "Formule", method.formula], [isEn ? "Source" : "Source", method.source], [isEn ? "Frequency" : "Fréquence", method.recalc], [isEn ? "Limits" : "Limites", method.limits]].map(([name,value]) => <div key={name}><dt className="font-bold cmm-text-primary">{name}</dt><dd className="break-words">{value}</dd></div>)}</dl>
    </details></CmmCard>)}
    <div className="flex flex-wrap gap-2"><CmmButton href="/methodologie" tone="secondary">{isEn ? "Scientific protocol" : "Protocole scientifique"}</CmmButton><CmmButton href="/reports" tone="primary">{isEn ? "Reports and exports" : "Rapports et exports"}</CmmButton></div>
  </section>;
}
