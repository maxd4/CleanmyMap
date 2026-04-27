"use client";

import Link from"next/link";
import { CHAPTERS, GLOSSARY_ROWS } from"./constants";
import { toFrInt, toFrNumber } from"./analytics";
import { GeoCoverageRing, InsightBox, MetricCard, MonthlyBars, ReportPage, ReportTable } from"./ui";
import type { ReportModel } from"./types";

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
"Priorités opérationnelles, itinéraires, météo et checklists lisibles en moins de 2 minutes.",
"Zones à traiter, volumes estimés et points de vigilance directement exploitables.",
 ]}
 />
 <InsightBox
 title="Lecture décideur"
 lines={[
"KPI consolidés, qualité des données, tendances et priorisation territoriale.",
"Bloc gouvernance + annexes pour arbitrage budgétaire et diffusion institutionnelle.",
 ]}
 />
 </div>
 <ReportTable
 headers={["Partie","Objectif","Public principal"]}
 rows={CHAPTERS.slice(1).map((chapter) => [
 chapter.title,
 chapter.subtitle,
 chapter.audience ==="terrain"
 ?"Bénévoles"
 : chapter.audience ==="strategie"
 ?"Décideurs"
 :"Mixte",
 ])}
 />
 </ReportPage>

 <ReportPage {...CHAPTERS[1]}>
 <div className="grid gap-3 md:grid-cols-3">
 <MetricCard
 label="Actions validées"
 value={toFrInt(report.totals.actions)}
 hint="Périmètre: 12 derniers mois"
 />
 <MetricCard label="Volume collecte" value={`${toFrNumber(report.totals.kg)} kg`} tone="accent" />
 <MetricCard label="Mégots retirés" value={toFrInt(report.totals.butts)} tone="accent" />
 <MetricCard label="Bénévoles mobilisés" value={toFrInt(report.totals.volunteers)} />
 <MetricCard label="Heures bénévoles" value={`${toFrNumber(report.totals.hours)} h`} />
 <MetricCard
 label="Tendance 30j"
 value={`${report.trendPercent >= 0 ?"+" :""}${toFrNumber(report.trendPercent)}%`}
 hint="vs période précédente"
 tone={report.trendPercent > 0 ?"danger" :"base"}
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
 label="Conversion modération"
 value={`${toFrNumber(report.moderation.conversion)}%`}
 tone="accent"
 />
 </div>
 <div className="grid gap-3 md:grid-cols-2">
 <InsightBox
 title="Qualité de données"
 lines={[
 `Complétude: ${toFrNumber(report.quality.completenessScore)}%`,
 `Cohérence: ${toFrNumber(report.quality.coherenceScore)}%`,
 `Fraîcheur médiane: ${toFrNumber(report.quality.freshnessDays)} jours`,
 `Taux de géolocalisation: ${toFrNumber(report.quality.geolocRate)}%`,
 ]}
 />
 <InsightBox
 title="Priorités décisionnelles"
 lines={[
"Cibler en priorité les 3 zones avec score de récurrence le plus élevé.",
"Stabiliser un délai de modération court pour fiabiliser la publication.",
"Exploiter la tendance glissante 30 jours pour arbitrage hebdomadaire.",
 ]}
 />
 </div>
 <ReportTable
 headers={["Zone","Actions","Kg","Recurrence","Score"]}
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
 <MetricCard label="Spots signalés" value={toFrInt(report.terrain.spotCount)} />
 <MetricCard label="Lieux propres" value={toFrInt(report.terrain.cleanPlaceCount)} />
 <MetricCard label="Distance itinéraire" value={`${toFrNumber(report.routeDistance)} km`} tone="accent" />
 </div>
 <div className="grid gap-3 md:grid-cols-2">
 <GeoCoverageRing coveragePercent={report.map.geoCoverage} tracePercent={report.map.traceCoverage} />
 <InsightBox
 title="Recommandations opérationnelles"
 lines={[
"Passer en priorité par les étapes à score kg+mégots le plus élevé.",
"Capturer une trace/polygone quand l'action couvre plusieurs segments.",
"Documenter les zones de tri dès la collecte pour accélérer la valorisation.",
 ]}
 />
 </div>
 <ReportTable
 headers={["Étape","Zone","Kg","Mégots","Segment","Navigation"]}
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
 : [["-","Aucune étape calculable","-","-","-","-"]]
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
 title="Impacts estimés"
 lines={[
 `Eau potentiellement protégée: ${toFrInt(report.climate.waterProtectedLiters)} L`,
 `CO2e évité (proxy): ${toFrNumber(report.climate.co2AvoidedKg)} kg`,
 `Indice de tri propre: ${toFrNumber(report.recycling.triIndex)} / 100`,
 `Volume triable (proxy): ${toFrNumber(report.recycling.recyclableKg)} kg`,
 ]}
 />
 <InsightBox
 title="Météo opérationnelle"
 lines={[
 weatherAdvice,
 `Température: ${weather.current?.temperature_2m ??"n/a"} °C`,
 `Précipitations: ${weather.current?.precipitation ??"n/a"} mm`,
 `Vent: ${weather.current?.wind_speed_10m ??"n/a"} km/h`,
 ]}
 />
 </div>
 <ReportTable
 headers={["Zone","Actions","Kg","Mégots","Kg/action"]}
 rows={report.annualRows.length > 0 ? report.annualRows : [["n/a","0","0","0","0"]]}
 />
 </ReportPage>

 <ReportPage {...CHAPTERS[5]}>
 <div className="grid gap-3 md:grid-cols-4">
 <MetricCard label="Événements créés" value={toFrInt(report.community.totalEvents)} />
 <MetricCard label="À venir" value={toFrInt(report.community.upcomingEvents)} />
 <MetricCard label="Passés" value={toFrInt(report.community.pastEvents)} />
 <MetricCard label="Taux RSVP oui" value={`${toFrNumber(report.community.participationRate)}%`} tone="accent" />
 </div>
 <div className="grid gap-3 md:grid-cols-2">
 <ReportTable
 headers={["Indicateur","Valeur","Lecture"]}
 rows={[
 [
"RSVP oui / maybe / non",
 `${toFrInt(report.community.rsvp.yes)} / ${toFrInt(report.community.rsvp.maybe)} / ${toFrInt(report.community.rsvp.no)}`,
"Niveau d'engagement des événements",
 ],
 [
"Badges confirmés (5+)",
 toFrInt(report.community.badgeConfirmed),
"Progression régulière des contributeurs",
 ],
 [
"Badges experts (10+)",
 toFrInt(report.community.badgeExpert),
"Noyau bénévole structurant",
 ],
 [
"Répartition citoyen/asso/institution",
 `${toFrInt(report.community.sourceBuckets.citoyen)} / ${toFrInt(report.community.sourceBuckets.associatif)} / ${toFrInt(report.community.sourceBuckets.institutionnel)}`,
"Équilibre de l'écosystème",
 ],
 ]}
 />
 <InsightBox
 title="Actions recommandées"
 lines={[
"Caler les campagnes terrain sur les événements à plus fort RSVP oui.",
"Rendre les paliers de badges visibles dans les parcours bénévoles.",
"Activer des partenariats commerçants/entreprises sur les zones de récurrence.",
 ]}
 />
 </div>
 <ReportTable
 headers={["Rang","Contributeur","Actions","Kg","Mégots"]}
 rows={
 report.community.topLeaderboard.length > 0
 ? report.community.topLeaderboard.map((entry, index) => [
 `#${index + 1}`,
 entry.name,
 toFrInt(entry.actions),
 toFrNumber(entry.kg),
 toFrInt(entry.butts),
 ])
 : [["-","Aucune donnée","0","0","0"]]
 }
 />
 </ReportPage>

 <ReportPage {...CHAPTERS[6]}>
 <div className="grid gap-3 md:grid-cols-2">
 <InsightBox
 title="Encadré méthodologie"
 lines={[
"Sources: actions validées, carte, événements communauté, météo opérationnelle.",
"Définitions: les KPI sont recalculés en direct sur la fenêtre de données affichée.",
 `Version proxy: ${report.impactMethodology.proxyVersion} | Règles qualité: ${report.impactMethodology.qualityRulesVersion}.`,
 `Score pollution moyen: ${toFrNumber(report.impactMethodology.pollutionScoreAverage)} / 100.`,
"Règle qualité: publication externe recommandée seulement si complétude > 85%.",
 ]}
 />
 <ReportTable
 headers={["Version","Date","Périmètre","Auteur"]}
 rows={[
 [
"v3.0 web-report",
 report.generatedAt,
"Rubrique reports (web native exhaustive)",
"Équipe CleanMyMap",
 ],
 ["v2.x PDF","Pipeline back-office","Rapport PDF institutionnel","Équipe data"],
 ]}
 />
 </div>
 <ReportTable
 headers={["Mesure","Formule","Interprétation"]}
 rows={report.impactMethodology.formulas.map((formula) => [
 formula.label,
 formula.formula,
 formula.interpretation,
 ])}
 />
 <div className="grid gap-3 md:grid-cols-2">
 <ReportTable
 headers={["Hypothèse","Détail"]}
 rows={report.impactMethodology.hypotheses.map((item) => [
"Hypothèse de calcul",
 item,
 ])}
 />
 <ReportTable
 headers={["Marge d'erreur","Valeur","Nature"]}
 rows={[
 [
"Eau sauvée (proxy)",
 `+/- ${toFrNumber(report.impactMethodology.errorMargins.waterSavedLitersPct, 0)}%`,
"Approximation",
 ],
 [
"CO2 évité (proxy)",
 `+/- ${toFrNumber(report.impactMethodology.errorMargins.co2AvoidedKgPct, 0)}%`,
"Approximation",
 ],
 [
"Surface nettoyée (proxy)",
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
 headers={["Contrôle","Valeur","Interprétation"]}
 rows={[
 ["Complétude", `${toFrNumber(report.quality.completenessScore)}%`,"Présence des champs clés"],
 ["Cohérence", `${toFrNumber(report.quality.coherenceScore)}%`,"Valeurs plausibles et non négatives"],
 ["Fraîcheur médiane", `${toFrNumber(report.quality.freshnessDays)} j`,"Délai médian entre action et consultation"],
 ["Géolocalisation", `${toFrNumber(report.quality.geolocRate)}%`,"Taux de preuves spatiales exploitables"],
 ["Délai modération moyen", `${toFrNumber(report.moderation.delayDays)} j`,"Vitesse de publication validée"],
 ]}
 />
 </ReportPage>

 <ReportPage {...CHAPTERS[7]}>
 <ReportTable
 headers={["Sprint","Période","Objectif principal","Responsables"]}
 rows={report.calendar}
 />
 <div className="grid gap-3 md:grid-cols-2">
 <InsightBox
 title="Lecture bénévoles"
 lines={[
"Sprint 2 priorise la lisibilité des zones, parcours et checklists opérationnelles.",
"Sprint 4 diffuse les bonnes pratiques pour montée en charge nationale.",
 ]}
 />
 <InsightBox
 title="Lecture décideurs"
 lines={[
"Sprint 1 sécurise la fiabilité data avant tout arbitrage public.",
"Sprint 3 structure la preuve d'impact pour les budgets et infrastructures environnementales.",
 ]}
 />
 </div>
 </ReportPage>

 <ReportPage {...CHAPTERS[8]}>
 <ReportTable
 headers={["Terme","Définition claire"]}
 rows={GLOSSARY_ROWS.map((row) => [...row])}
 />
 </ReportPage>

 <ReportPage {...CHAPTERS[9]}>
 <div className="grid gap-3 md:grid-cols-2">
 <ReportTable
 headers={["Bloc","Donnée clé","Usage"]}
 rows={[
 [
"Pilotage",
 `${toFrInt(report.totals.actions)} actions / ${toFrNumber(report.totals.kg)} kg`,
"Arbitrage de priorités et suivi des performances",
 ],
 ["Terrain", `${toFrNumber(report.routeDistance)} km de circuit recommandé`,"Préparation opérationnelle des équipes"],
 [
"Contexte",
 `${toFrInt(report.climate.waterProtectedLiters)} L eau protégée (proxy)`,
"Plaidoyer et communication institutionnelle",
 ],
 ["Communauté", `${toFrInt(report.community.totalEvents)} événements`,"Activation réseau bénévole et partenaires"],
 ]}
 />
 <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">Liens d&apos;action immédiate</h3>
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
 href="#sommaire"
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 Retour au sommaire
 </a>
 </div>
 <p className="mt-3 cmm-text-caption cmm-text-muted">
 Les exports CSV/JSON et la modération admin restent disponibles dans le panneau opérationnel en bas
 de page.
 </p>
 </article>
 </div>
 </ReportPage>

 {isLoading ? (
 <p className="rounded-xl border border-slate-200 bg-white p-3 cmm-text-small cmm-text-muted">
 Mise à jour du rapport web en cours...
 </p>
 ) : null}
 {hasError ? (
 <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 cmm-text-small text-rose-700">
 Certaines sources n&apos;ont pas pu être chargées. Le rapport reste visible avec les données disponibles.
 </p>
 ) : null}
 </div>
 );
}
