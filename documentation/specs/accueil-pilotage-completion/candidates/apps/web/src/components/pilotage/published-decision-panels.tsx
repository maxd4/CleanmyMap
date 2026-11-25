import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";
import { buildReportDataAvailabilityNotices } from "@/lib/reports/data-availability";

export function PublishedDecisionScope({ overview }: { overview: Pick<PilotageOverview, "periodDays" | "generatedAt" | "comparison" | "dataAvailability"> }) {
  return <CmmCard size="sm" className="space-y-1">
    <p className="font-semibold cmm-text-primary">Plateforme entière · {overview.periodDays} jours</p>
    <p className="text-sm cmm-text-secondary">{overview.comparison.current.approvedActions} actions publiques terminées dans la période · calculé le {new Date(overview.generatedAt).toLocaleString("fr-FR")}</p>
    {buildReportDataAvailabilityNotices(overview.dataAvailability).map(notice => <p key={notice} role="status" className="text-sm cmm-text-warning">{notice}</p>)}
  </CmmCard>;
}

export function PublishedDecisionZones({ zones }: { zones: PilotageOverview["zones"] }) {
  return <section className="space-y-3"><h2 className="text-xl font-bold cmm-text-primary">Zones observées</h2>
    {zones.length === 0 ? <CmmCard><p className="cmm-text-secondary">Aucune zone dans les résultats chargés.</p></CmmCard> : <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {zones.map(zone => <CmmCard key={zone.area} className="space-y-3">
        <h3 className="font-bold cmm-text-primary">{zone.area}</h3>
        <p className="text-sm cmm-text-secondary">Score : {zone.normalizedScore.toFixed(1)} · {zone.urgency}</p>
        <p className="text-sm cmm-text-secondary">{zone.currentActions} actions · {zone.currentWasteCoverageRate === 0 ? "masse non renseignée" : `${zone.currentKg} kg renseignés`}</p>
        <p className="text-sm cmm-text-secondary">{zone.justification}</p><p className="font-semibold cmm-text-primary">{zone.recommendedAction}</p>
      </CmmCard>)}
    </div>}
    <CmmButton href="/actions/map" tone="secondary">Explorer la carte</CmmButton>
  </section>;
}

export function PublishedDecisionMethods({ methods }: { methods: PilotageOverview["methods"] }) {
  return <section className="space-y-3"><h2 className="text-xl font-bold cmm-text-primary">Méthodes et limites</h2>
    {methods.map(method => <CmmCard key={method.id}><details className="space-y-3"><summary className="cursor-pointer font-semibold cmm-text-primary">{method.kpi}</summary>
      <dl className="space-y-2 text-sm cmm-text-secondary">{[["Formule", method.formula], ["Source", method.source], ["Fréquence", method.recalc], ["Limites", method.limits]].map(([name,value]) => <div key={name}><dt className="font-bold cmm-text-primary">{name}</dt><dd className="break-words">{value}</dd></div>)}</dl>
    </details></CmmCard>)}
    <div className="flex flex-wrap gap-2"><CmmButton href="/methodologie" tone="secondary">Protocole scientifique</CmmButton><CmmButton href="/reports" tone="primary">Rapports et exports</CmmButton></div>
  </section>;
}
