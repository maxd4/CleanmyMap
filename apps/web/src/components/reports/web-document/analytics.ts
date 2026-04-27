import {
 mapItemCigaretteButts,
 mapItemCoordinates,
 mapItemLocationLabel,
 mapItemType,
 mapItemWasteKg,
} from"@/lib/actions/data-contract";
import { evaluateActionQuality } from"@/lib/actions/quality";
import { buildPersonalImpactMethodology } from"@/lib/gamification/progression-impact";
import type { ActionListItem, ActionMapItem } from"@/lib/actions/types";
import { extractArrondissement, monthKey } from"@/components/sections/rubriques/helpers";
import type { MonthRow, ReportModel, ReportModelInput, RouteStep } from"./types";

export function toFrNumber(value: number, digits = 1): string {
 return new Intl.NumberFormat("fr-FR", {
 maximumFractionDigits: digits,
 minimumFractionDigits: digits,
 }).format(value);
}

export function toFrInt(value: number): string {
 return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

export function toFrDate(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) return value;
 return new Intl.DateTimeFormat("fr-FR", { dateStyle:"medium" }).format(parsed);
}

export function average(values: number[]): number {
 if (values.length === 0) return 0;
 return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function median(values: number[]): number {
 if (values.length === 0) return 0;
 const ordered = [...values].sort((a, b) => a - b);
 const middle = Math.floor(ordered.length / 2);
 if (ordered.length % 2 === 0) return (ordered[middle - 1] + ordered[middle]) / 2;
 return ordered[middle];
}

export function normalizeListType(item: ActionListItem):"action" |"spot" |"clean_place" {
 if (item.contract?.type) return item.contract.type;
 if (item.record_type ==="clean_place") return"clean_place";
 if (item.record_type ==="other") return"spot";
 return"action";
}

function scoreAction(kg: number, butts: number): number {
 return kg * 10 + butts * 0.05;
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
 const dLat = a.latitude - b.latitude;
 const dLon = a.longitude - b.longitude;
 return Math.sqrt(dLat * dLat + dLon * dLon) * 111;
}

export function buildRouteSteps(items: ActionMapItem[], maxStops: number): RouteStep[] {
 const geolocated = items
 .map((item) => {
 const coordinates = mapItemCoordinates(item);
 return {
 item,
 label: mapItemLocationLabel(item),
 kg: (mapItemWasteKg(item) ?? 0),
 butts: (mapItemCigaretteButts(item) ?? 0),
 latitude: coordinates.latitude,
 longitude: coordinates.longitude,
 };
 })
 .filter(
 (
 entry,
 ): entry is {
 item: ActionMapItem;
 label: string;
 kg: number;
 butts: number;
 latitude: number;
 longitude: number;
 } => entry.latitude !== null && entry.longitude !== null,
 )
 .sort((a, b) => scoreAction(b.kg, b.butts) - scoreAction(a.kg, a.butts))
 .slice(0, maxStops);

 const ordered = [...geolocated].sort((a, b) => {
 if (a.latitude !== b.latitude) return a.latitude - b.latitude;
 return a.longitude - b.longitude;
 });

 return ordered.map((entry, index) => {
 const previous = ordered[index - 1];
 const segmentKm = previous
 ? distanceKm(
 { latitude: previous.latitude, longitude: previous.longitude },
 { latitude: entry.latitude, longitude: entry.longitude },
 )
 : 0;
 return {
 index: index + 1,
 label: entry.label,
 kg: entry.kg,
 butts: entry.butts,
 segmentKm,
 latitude: entry.latitude,
 longitude: entry.longitude,
 };
 });
}

export function buildMonthRows(items: ActionListItem[]): MonthRow[] {
 const grouped = new Map<string, MonthRow>();
 for (const item of items) {
 const key = monthKey(item.action_date);
 const previous = grouped.get(key) ?? {
 month: key,
 actions: 0,
 kg: 0,
 butts: 0,
 volunteers: 0,
 minutes: 0,
 };
 previous.actions += 1;
 previous.kg += Number(item.waste_kg || 0);
 previous.butts += Number(item.cigarette_butts || 0);
 previous.volunteers += Number(item.volunteers_count || 0);
 previous.minutes += Number(item.duration_minutes || 0);
 grouped.set(key, previous);
 }
 return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function buildCalendarRows(now: Date): Array<[string, string, string, string]> {
 const monthLabels = ["Jan","Fev","Mar","Avr","Mai","Juin","Juil","Aou","Sep","Oct","Nov","Dec"];
 const entries: Array<[string, string, string, string]> = [];
 for (let offset = 0; offset < 4; offset += 1) {
 const current = new Date(now.getFullYear(), now.getMonth() + offset, 1);
 const monthLabel = monthLabels[current.getMonth()];
 const slot = `${monthLabel} ${current.getFullYear()}`;
 if (offset === 0) {
 entries.push([
 `Sprint 1 - ${monthLabel}`,
 slot,
"Consolidation data quality + moderation, socle KPI stable.",
"Data + Ops",
 ]);
 continue;
 }
 if (offset === 1) {
 entries.push([
 `Sprint 2 - ${monthLabel}`,
 slot,
"Accélération terrain (itinéraires, zones récurrence, couverture tracée).",
"Ops terrain",
 ]);
 continue;
 }
 if (offset === 2) {
 entries.push([
 `Sprint 3 - ${monthLabel}`,
 slot,
"Pack elus/institutions (benchmark, annexes, dossier budgetaire).",
"Pilotage + Collectivites",
 ]);
 continue;
 }
 entries.push([
 `Sprint 4 - ${monthLabel}`,
 slot,
"Diffusion nationale et boucle d'amelioration continue du rapport web.",
"Produit + Communication",
 ]);
 }
 return entries;
}

export function getWeatherAdvice(params: {
 temperature: number;
 rain: number;
 wind: number;
}): string {
 if (params.rain >= 3 || params.wind >= 40) {
 return"Niveau météo prudent: renforcer EPI, réduire durée et sécuriser les points d'appui.";
 }
 if (params.temperature >= 28) {
 return"Niveau météo chaud: prévoir eau, pauses et roulement de l'équipe.";
 }
 if (params.temperature <= 3) {
 return"Niveau météo froid: cycles courts et protection renforcée des mains.";
 }
 return"Niveau météo favorable: fenêtre opérationnelle standard.";
}

export function computeReportModel(input: ReportModelInput): ReportModel {
 const now = input.now ?? new Date();
 const nowMs = now.getTime();
 const allItems = input.allItems;
 const approvedItems = input.approvedItems;
 const mapItems = input.mapItems;
 const events = input.events;

 const approvedActions = approvedItems.filter((item) => normalizeListType(item) ==="action");
 const allStatuses = {
 pending: allItems.filter((item) => item.status ==="pending").length,
 approved: allItems.filter((item) => item.status ==="approved").length,
 rejected: allItems.filter((item) => item.status ==="rejected").length,
 };

 const totalKg = approvedActions.reduce((sum, item) => sum + Number(item.waste_kg || 0), 0);
 const totalButts = approvedActions.reduce((sum, item) => sum + Number(item.cigarette_butts || 0), 0);
 const totalVolunteers = approvedActions.reduce((sum, item) => sum + Number(item.volunteers_count || 0), 0);
 const totalHours = approvedActions.reduce(
 (sum, item) => sum + (Number(item.duration_minutes || 0) * Number(item.volunteers_count || 0)) / 60,
 0,
 );

 const mapApproved = mapItems.filter((item) => item.status ==="approved");
 const mapApprovedActions = mapApproved.filter((item) => mapItemType(item) ==="action");
 const mapSpots = mapItems.filter((item) => mapItemType(item) ==="spot");
 const mapCleanPlaces = mapItems.filter((item) => mapItemType(item) ==="clean_place");

 const geolocatedCount = mapApproved.filter((item) => {
 const coordinates = mapItemCoordinates(item);
 return coordinates.latitude !== null && coordinates.longitude !== null;
 }).length;

 const traceCount = mapApproved.filter((item) =>
 Boolean(item.manual_drawing || item.manual_drawing_geojson || item.contract?.geometry.kind !=="point"),
 ).length;
 const polylineCount = mapApproved.filter((item) => {
 const kind = item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
 return kind ==="polyline";
 }).length;
 const polygonCount = mapApproved.filter((item) => {
 const kind = item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
 return kind ==="polygon";
 }).length;

 const geoCoverage = mapApproved.length > 0 ? (geolocatedCount / mapApproved.length) * 100 : 0;
 const traceCoverage = mapApproved.length > 0 ? (traceCount / mapApproved.length) * 100 : 0;

 const moderationProcessed = allStatuses.approved + allStatuses.rejected;
 const moderationConversion =
 moderationProcessed > 0 ? (allStatuses.approved / moderationProcessed) * 100 : 0;

 const moderationDelayDays = allItems
 .map((item) => {
 const created = item.contract?.dates.createdAt ?? item.created_at;
 const validated = item.contract?.dates.validatedAt ?? null;
 if (!created || !validated) return null;
 const createdMs = new Date(created).getTime();
 const validatedMs = new Date(validated).getTime();
 if (!Number.isFinite(createdMs) || !Number.isFinite(validatedMs) || validatedMs < createdMs) return null;
 return (validatedMs - createdMs) / (24 * 60 * 60 * 1000);
 })
 .filter((value): value is number => value !== null);

 const completenessChecks = approvedActions.map((item) => {
 const hasDate = Boolean(item.action_date);
 const hasLocation = item.location_label.trim().length > 2;
 const hasDuration = Number(item.duration_minutes || 0) > 0;
 const hasVolunteers = Number(item.volunteers_count || 0) > 0;
 const hasWaste = Number(item.waste_kg || 0) >= 0;
 return hasDate && hasLocation && hasDuration && hasVolunteers && hasWaste;
 });
 const completenessScore =
 completenessChecks.length > 0
 ? (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100
 : 0;

 const coherenceChecks = approvedActions.map((item) => {
 const waste = Number(item.waste_kg || 0);
 const butts = Number(item.cigarette_butts || 0);
 const volunteers = Number(item.volunteers_count || 0);
 const minutes = Number(item.duration_minutes || 0);
 return waste >= 0 && butts >= 0 && volunteers >= 1 && minutes >= 5;
 });
 const coherenceScore =
 coherenceChecks.length > 0 ? (coherenceChecks.filter(Boolean).length / coherenceChecks.length) * 100 : 0;

 const freshnessDays = median(
 approvedActions
 .map((item) => {
 const timestamp = new Date(item.action_date).getTime();
 if (!Number.isFinite(timestamp)) return null;
 return (nowMs - timestamp) / (24 * 60 * 60 * 1000);
 })
 .filter((value): value is number => value !== null && value >= 0),
 );
 const pollutionScoreAverage = average(
 approvedActions.map((item) => evaluateActionQuality(item).score),
 );

 const byAreaMap = new Map<string, { actions: number; kg: number; butts: number; labels: Set<string> }>();
 for (const item of mapApprovedActions) {
 const area = extractArrondissement(mapItemLocationLabel(item));
 const previous = byAreaMap.get(area) ?? {
 actions: 0,
 kg: 0,
 butts: 0,
 labels: new Set<string>(),
 };
 previous.actions += 1;
 previous.kg += (mapItemWasteKg(item) ?? 0);
 previous.butts += (mapItemCigaretteButts(item) ?? 0);
 previous.labels.add(mapItemLocationLabel(item).trim().toLowerCase());
 byAreaMap.set(area, previous);
 }

 const byArea = [...byAreaMap.entries()]
 .map(([area, stats]) => {
 const recurrence = Math.max(0, stats.actions - stats.labels.size);
 const score = stats.kg * 1.4 + stats.actions * 2 + stats.butts * 0.01 + recurrence * 5;
 return {
 area,
 actions: stats.actions,
 kg: stats.kg,
 butts: stats.butts,
 recurrence,
 score,
 };
 })
 .sort((a, b) => b.score - a.score);

 const currentFloor = nowMs - 30 * 24 * 60 * 60 * 1000;
 const previousFloor = nowMs - 60 * 24 * 60 * 60 * 1000;
 const currentActions = approvedActions.filter((item) => {
 const timestamp = new Date(item.action_date).getTime();
 return Number.isFinite(timestamp) && timestamp >= currentFloor;
 });
 const previousActions = approvedActions.filter((item) => {
 const timestamp = new Date(item.action_date).getTime();
 return Number.isFinite(timestamp) && timestamp >= previousFloor && timestamp < currentFloor;
 });
 const trendPercent =
 previousActions.length > 0
 ? ((currentActions.length - previousActions.length) / previousActions.length) * 100
 : currentActions.length > 0
 ? 100
 : 0;

 const monthRows = buildMonthRows(approvedActions);
 const monthRows6 = monthRows.slice(-6);
 const monthRows12 = monthRows.slice(-12);
 const routeSteps = buildRouteSteps(mapApprovedActions, 6);
 const routeDistance = routeSteps.reduce((sum, step) => sum + step.segmentKm, 0);

 const recyclableKg = totalKg * 0.55;
 const triIndex =
 totalKg > 0 ? Math.max(0, Math.min(100, 100 - (totalButts / Math.max(totalKg, 1)) * 0.7)) : 0;

 const sixMonthsFloor = nowMs - 183 * 24 * 60 * 60 * 1000;
 const twelveMonthsFloor = nowMs - 365 * 24 * 60 * 60 * 1000;
 const sixMonthsItems = approvedActions.filter((item) => {
 const timestamp = new Date(item.action_date).getTime();
 return Number.isFinite(timestamp) && timestamp >= sixMonthsFloor;
 });
 const twelveMonthsItems = approvedActions.filter((item) => {
 const timestamp = new Date(item.action_date).getTime();
 return Number.isFinite(timestamp) && timestamp >= twelveMonthsFloor;
 });

 const climate6 = {
 actions: sixMonthsItems.length,
 kg: sixMonthsItems.reduce((sum, item) => sum + Number(item.waste_kg || 0), 0),
 butts: sixMonthsItems.reduce((sum, item) => sum + Number(item.cigarette_butts || 0), 0),
 };
 const climate12 = {
 actions: twelveMonthsItems.length,
 kg: twelveMonthsItems.reduce((sum, item) => sum + Number(item.waste_kg || 0), 0),
 butts: twelveMonthsItems.reduce((sum, item) => sum + Number(item.cigarette_butts || 0), 0),
 };

 const waterProtectedLiters = Math.round(totalButts * 500);
 const co2AvoidedKg = totalButts * 0.0014;

 const eventUpcoming = events.filter((event) => event.eventDate >= now.toISOString().slice(0, 10));
 const eventPast = events.filter((event) => event.eventDate < now.toISOString().slice(0, 10));
 const rsvp = events.reduce(
 (acc, event) => {
 acc.yes += event.rsvpCounts.yes;
 acc.maybe += event.rsvpCounts.maybe;
 acc.no += event.rsvpCounts.no;
 return acc;
 },
 { yes: 0, maybe: 0, no: 0 },
 );
 const rsvpTotal = rsvp.yes + rsvp.maybe + rsvp.no;
 const participationRate = rsvpTotal > 0 ? (rsvp.yes / rsvpTotal) * 100 : 0;

 const leaderboard = [...approvedActions]
 .reduce((map, item) => {
 const actor = item.actor_name?.trim() ||"Anonyme";
 const previous = map.get(actor) ?? { actions: 0, kg: 0, butts: 0 };
 map.set(actor, {
 actions: previous.actions + 1,
 kg: previous.kg + Number(item.waste_kg || 0),
 butts: previous.butts + Number(item.cigarette_butts || 0),
 });
 return map;
 }, new Map<string, { actions: number; kg: number; butts: number }>())
 .entries();

 const topLeaderboard = [...leaderboard]
 .map(([name, stats]) => ({ name, ...stats }))
 .sort((a, b) => b.actions - a.actions || b.kg - a.kg)
 .slice(0, 8);

 const badgeConfirmed = topLeaderboard.filter((entry) => entry.actions >= 5).length;
 const badgeExpert = topLeaderboard.filter((entry) => entry.actions >= 10).length;

 const sourceBuckets = allItems.reduce(
 (acc, item) => {
 const source = (item.source ?? item.contract?.source ??"web_form").toLowerCase();
 if (source.includes("community")) acc.associatif += 1;
 else if (source.includes("admin") || source.includes("import")) acc.institutionnel += 1;
 else acc.citoyen += 1;
 return acc;
 },
 { citoyen: 0, associatif: 0, institutionnel: 0 },
 );

 const annualRows = byArea.slice(0, 8).map((row) => [
 row.area,
 toFrInt(row.actions),
 `${toFrNumber(row.kg)} kg`,
 toFrInt(row.butts),
 `${toFrNumber(row.actions > 0 ? row.kg / row.actions : 0, 2)} kg/action`,
 ]);

 return {
 generatedAt: new Intl.DateTimeFormat("fr-FR", {
 dateStyle:"long",
 timeStyle:"short",
 }).format(now),
 totals: {
 actions: approvedActions.length,
 kg: totalKg,
 butts: totalButts,
 volunteers: totalVolunteers,
 hours: totalHours,
 },
 map: {
 points: geolocatedCount,
 traces: traceCount,
 polylines: polylineCount,
 polygons: polygonCount,
 geoCoverage,
 traceCoverage,
 },
 moderation: {
 ...allStatuses,
 conversion: moderationConversion,
 delayDays: average(moderationDelayDays),
 },
 quality: {
 completenessScore,
 coherenceScore,
 freshnessDays,
 geolocRate: geoCoverage,
 },
 areas: byArea,
 trendPercent,
 monthRows6,
 monthRows12,
 routeSteps,
 routeDistance,
 terrain: {
 actionCount: mapApprovedActions.length,
 spotCount: mapSpots.length,
 cleanPlaceCount: mapCleanPlaces.length,
 },
 recycling: { recyclableKg, triIndex },
 climate: {
 six: climate6,
 twelve: climate12,
 waterProtectedLiters,
 co2AvoidedKg,
 },
 community: {
 totalEvents: events.length,
 upcomingEvents: eventUpcoming.length,
 pastEvents: eventPast.length,
 rsvp,
 participationRate,
 topLeaderboard,
 badgeConfirmed,
 badgeExpert,
 sourceBuckets,
 },
 impactMethodology: buildPersonalImpactMethodology(pollutionScoreAverage),
 annualRows,
 calendar: buildCalendarRows(now),
 };
}

export type ExecutiveNarrative = {
 readinessScore: number;
 readinessLabel: string;
 headline: string;
 summary: string;
 evidence: string[];
 budgetUseCases: string[];
 watchouts: string[];
};

export function buildExecutiveNarrative(report: ReportModel): ExecutiveNarrative {
 const readinessScore = average([
 report.quality.completenessScore,
 report.quality.coherenceScore,
 report.map.geoCoverage,
 report.moderation.conversion,
 ]);

 const readinessLabel =
 readinessScore >= 85
 ?"Lecture budgétaire solide"
 : readinessScore >= 70
 ?"Lecture crédible avec vigilance"
 :"Lecture à consolider";

 const topArea = report.areas[0];
 const topAreaSummary = topArea
 ? `${topArea.area} concentre ${toFrNumber(topArea.kg)} kg sur ${toFrInt(topArea.actions)} actions et reste la zone la plus sensible.`
 :"Aucune zone prioritaire n'est ressortie sur la fenêtre analysée.";

 const summary = [
 topAreaSummary,
 `La géolocalisation atteint ${toFrNumber(report.map.geoCoverage)}%, la qualité de données ${toFrNumber(report.quality.completenessScore)}% et la conversion de modération ${toFrNumber(report.moderation.conversion)}%.`,
 ].join("");

 return {
 readinessScore: Math.round(readinessScore * 10) / 10,
 readinessLabel,
 headline:"Rapport d'impact institutionnel prêt à diffuser",
 summary,
 evidence: [
 `${toFrInt(report.totals.actions)} actions validées`,
 `${toFrNumber(report.totals.kg)} kg collectés`,
 `${toFrNumber(report.map.geoCoverage)}% de géolocalisation`,
 `${toFrNumber(report.quality.coherenceScore)}% de cohérence`,
 ],
 budgetUseCases: [
"Appuyer une demande de budget par la preuve territoriale.",
"Prioriser les zones de récurrence et les renforts de terrain.",
"Documenter la crédibilité des indicateurs avant diffusion institutionnelle.",
 ],
 watchouts: [
 `Délai de modération moyen: ${toFrNumber(report.moderation.delayDays)} jours.`,
 `Taux de traces/polygones: ${toFrNumber(report.map.traceCoverage)}%.`,
"Les montants restent des proxies de décision et doivent être lus avec la méthodologie jointe.",
 ],
 };
}
