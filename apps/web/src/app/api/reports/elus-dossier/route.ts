import { createHash } from "node:crypto";
import { computePeriodComparison } from"@/lib/analytics/period-comparison";
import {
 buildTerritorialBenchmark,
 type TerritorialBenchmarkRow,
} from"@/lib/analytics/territorial-benchmark";
import { toActionListItem } from"@/lib/actions/data-contract";
import { evaluateActionQuality } from"@/lib/actions/quality";
import { fetchUnifiedActionContracts } from"@/lib/actions/unified-source";
import {
 buildPersonalImpactMethodology,
} from"@/lib/gamification/progression-impact";
import type { PersonalImpactMethodology } from"@/lib/gamification/progression-types";
import { buildPilotageOverviewFromContracts } from"@/lib/pilotage/overview";
import type { ZoneComparisonRow } from"@/lib/pilotage/prioritization";
import { buildDeliverableHeaders } from"@/lib/reports/http";
import { filterActionContractsByScope } from"@/lib/reports/scope";
import { requireAdminAccess } from"@/lib/authz";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";

type ExportFormat ="json" |"md" |"pdf";
const ELUS_DOSSIER_BUCKET ="reports";
const ELUS_DOSSIER_RESPONSE_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";
const ELUS_DOSSIER_PDF_REDIRECT_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";

function parsePositiveInteger(
 raw: string | null,
 min: number,
 max: number,
 fallback: number,
): number {
 if (raw === null || raw.trim() ==="") {
 return fallback;
 }
 const parsed = Number(raw);
 if (!Number.isFinite(parsed)) {
 return fallback;
 }
 return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function parseExportFormat(raw: string | null): ExportFormat {
 if (raw ==="md" || raw ==="pdf") {
 return raw;
 }
 return"json";
}

function buildDateFloor(daysWindow: number): string {
 const now = new Date();
 now.setUTCHours(0, 0, 0, 0);
 now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
 return now.toISOString().slice(0, 10);
}

function toFiniteNumber(value: unknown): number {
 const number = typeof value === "number" ? value : Number(value);
 return Number.isFinite(number) ? number : 0;
}

function sumApprovedMetric<T>(
 contracts: Array<T>,
 selector: (contract: T) => unknown,
): number {
 return contracts.reduce((acc, contract) => acc + toFiniteNumber(selector(contract)), 0);
}

function countGeolocatedContracts<T extends {
 location: { latitude: number | null; longitude: number | null };
}>(contracts: Array<T>): number {
 return contracts.reduce((count, contract) => {
  if (contract.location.latitude === null || contract.location.longitude === null) {
   return count;
  }
  return count + 1;
 }, 0);
}

function buildDecisionPriorities(rows: TerritorialBenchmarkRow[]): Array<{
 area: string;
 urgency:"haute" |"moyenne" |"fond";
 reason: string;
 normalizedScore: number;
}> {
 return rows.slice(0, 5).map((row) => {
 const urgency =
 row.decisionLabel ==="Priorite haute"
 ?"haute"
 : row.decisionLabel ==="Priorite moyenne"
 ?"moyenne"
 :"fond";
 const reason =
 urgency ==="haute"
 ? `Pression forte (${row.actionsPerKm2} act/km2, ${row.kgPerKm2} kg/km2).`
 : urgency ==="moyenne"
 ? `Zone active a stabiliser (${row.actionsPerKm2} act/km2).`
 :"Surveillance reguliere suffisante sur la periode.";
 return {
 area: row.area,
 urgency,
 reason,
 normalizedScore: row.normalizedScore,
 };
 });
}

function buildMethodology(shared: PersonalImpactMethodology) {
 return {
 version:"elus-pack-v2.2",
 proxyVersion: shared.proxyVersion,
 qualityRulesVersion: shared.qualityRulesVersion,
 pollutionScoreAverage: shared.pollutionScoreAverage,
 formulas: [
 ...shared.formulas.map((item) => `${item.label}: ${item.formula}`),
"Normalisation inter-zones = actions/km2, kg/km2, volunteers/10k hab.",
 ],
 sources: [
 `Perimetre qualite: ${shared.scope}`,
"Actions unifiees (action, clean_place, spot) sur fenetre N et N-1.",
"Geo metadata (latitude/longitude, zone label) issues des contrats normalises.",
"Reference surface/densite par arrondissement pour normalisation.",
 ],
 limits: [
 ...shared.approximations,
 ...shared.hypotheses,
"Les proxies climat restent des ordres de grandeur, pas des mesures instrumentales.",
"Les comparaisons de zones sont sensibles a la qualite de geolocalisation.",
"Le score normalise est un outil d'aide a la decision, non un verdict automatique.",
 ],
 errorMargins: shared.errorMargins,
 };
}

function buildMarkdownPack(payload: {
 generatedAt: string;
 periodDays: number;
 summary: {
 totalActions: number;
 totalKg: number;
 totalVolunteers: number;
 geocoverageRate: number;
 };
 comparison: unknown;
 decisionPriorities: Array<{
 area: string;
 urgency: string;
 reason: string;
 normalizedScore: number;
 }>;
 territorialPriorities: TerritorialBenchmarkRow[];
 zoneComparisons: ZoneComparisonRow[];
 methodology: ReturnType<typeof buildMethodology>;
}): string {
 const priorities = payload.decisionPriorities
 .map(
 (row, index) =>
 `${index + 1}. **${row.area}** (urgence ${row.urgency.toUpperCase()}, score ${row.normalizedScore.toFixed(1)}) - ${row.reason}`,
 )
 .join("\n");

 const territorial = payload.territorialPriorities
 .slice(0, 8)
 .map(
 (row) =>
 `- ${row.area}: ${row.normalizedScore.toFixed(1)} | ${row.actionsPerKm2.toFixed(1)} act/km2 | ${row.kgPerKm2.toFixed(1)} kg/km2 | ${row.decisionLabel}`,
 )
 .join("\n");

 const zoneComparisons = payload.zoneComparisons
 .slice(0, 12)
 .map(
 (zone) =>
 `- ${zone.area}: actions ${zone.currentActions}/${zone.previousActions} (${zone.deltaActionsAbsolute >= 0 ?"+" :""}${zone.deltaActionsAbsolute.toFixed(1)} ; ${zone.deltaActionsPercent.toFixed(1)}%), kg ${zone.currentKg.toFixed(1)}/${zone.previousKg.toFixed(1)} (${zone.deltaKgAbsolute >= 0 ?"+" :""}${zone.deltaKgAbsolute.toFixed(1)} ; ${zone.deltaKgPercent.toFixed(1)}%), couverture ${zone.currentCoverageRate.toFixed(1)}%/${zone.previousCoverageRate.toFixed(1)}% (${zone.deltaCoverageRateAbsolute >= 0 ?"+" :""}${zone.deltaCoverageRateAbsolute.toFixed(1)} pt), delai moderation ${zone.currentModerationDelayDays.toFixed(1)}j/${zone.previousModerationDelayDays.toFixed(1)}j (${zone.deltaModerationDelayDaysAbsolute >= 0 ?"+" :""}${zone.deltaModerationDelayDaysAbsolute.toFixed(1)}j). Action: ${zone.recommendedAction}`,
 )
 .join("\n");

 return [
"# Dossier elu - Pack institutionnel",
"",
 `Genere le ${payload.generatedAt}`,
 `Periode observee: ${payload.periodDays} jours`,
"",
"## Resume executif",
 `- Actions validees: ${payload.summary.totalActions}`,
 `- Volume collecte: ${payload.summary.totalKg.toFixed(1)} kg`,
 `- Mobilisation: ${payload.summary.totalVolunteers} benevoles`,
 `- Geocouverture: ${payload.summary.geocoverageRate}%`,
"",
"## Top priorites territoriales",
 priorities ||"- Aucune priorite detectee.",
"",
"## Benchmark territorial (normalise)",
 territorial ||"- Donnees insuffisantes.",
"",
"## Comparatif zone par zone (courant vs precedent)",
 zoneComparisons ||"- Donnees zonales insuffisantes.",
"",
"## Comparatif N vs N-1 (trace JSON)",
"```json",
 JSON.stringify(payload.comparison, null, 2),
"```",
"",
"## Methode",
 `Version: ${payload.methodology.version} | Proxy: ${payload.methodology.proxyVersion} | Regles qualite: ${payload.methodology.qualityRulesVersion}`,
 `Score pollution moyen: ${payload.methodology.pollutionScoreAverage.toFixed(1)} / 100`,
"",
"Formules:",
 ...payload.methodology.formulas.map((line) => `- ${line}`),
"",
"Sources:",
 ...payload.methodology.sources.map((line) => `- ${line}`),
"",
"Limites:",
 ...payload.methodology.limits.map((line) => `- ${line}`),
"",
"Marges d'erreur indicatives:",
 `- Eau sauvee: +/- ${payload.methodology.errorMargins.waterSavedLitersPct}%`,
 `- CO2 evite: +/- ${payload.methodology.errorMargins.co2AvoidedKgPct}%`,
 `- Surface nettoyee: +/- ${payload.methodology.errorMargins.surfaceCleanedM2Pct}%`,
 `- Score pollution moyen: +/- ${payload.methodology.errorMargins.pollutionScoreMeanPoints} points`,
"",
 ].join("\n");
}

function resolveScopeSelection(params: {
 scopeKind: string | null;
 scopeValue: string | null;
 legacyAssociation: string | null;
}): {
 kind: "global" | "account" | "association" | "arrondissement";
 value: string | null;
} {
 return {
  kind:
   params.scopeKind ==="account" ||
   params.scopeKind ==="association" ||
   params.scopeKind ==="arrondissement"
    ? params.scopeKind
    : params.legacyAssociation
    ?"association"
    :"global",
  value:
   params.scopeValue ??
   (params.scopeKind ==="association" ? params.legacyAssociation : null) ??
   params.legacyAssociation,
 };
}

function buildElusDossierPdfStoragePath(params: {
 generatedAt: string;
 days: number;
 limit: number;
 scopeKind: "global" | "account" | "association" | "arrondissement";
 scopeValue: string | null;
}): string {
 const cacheKey = createHash("sha1")
  .update(
   JSON.stringify({
    generatedDate: params.generatedAt.slice(0, 10),
    days: params.days,
    limit: params.limit,
    scopeKind: params.scopeKind,
    scopeValue: params.scopeValue,
   }),
  )
  .digest("hex")
  .slice(0, 16);

 return `elus-dossier/${params.generatedAt.slice(0, 10)}/${cacheKey}.pdf`;
}

export async function GET(request: Request) {
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access);
 }

 const url = new URL(request.url);
 const days = parsePositiveInteger(url.searchParams.get("days"), 7, 365, 90);
 const limit = parsePositiveInteger(
  url.searchParams.get("limit"),
 50,
 2500,
 1200,
 );
 const format = parseExportFormat(url.searchParams.get("format"));
 const floorDate = buildDateFloor(days * 2);
 const scopeKind = url.searchParams.get("scopeKind");
 const scopeValue = url.searchParams.get("scopeValue");
 const legacyAssociation = url.searchParams.get("association");
 const scope = resolveScopeSelection({
  scopeKind,
  scopeValue,
  legacyAssociation,
 });
 const supabase = getSupabaseServerClient();
 const cacheDay = new Date().toISOString().slice(0, 10);
 const cachedPdfPath = buildElusDossierPdfStoragePath({
  generatedAt: cacheDay,
  days,
  limit,
  scopeKind: scope.kind,
  scopeValue: scope.value,
 });

 try {
 if (format ==="pdf") {
  const cachedExport = await supabase
  .from("reports")
  .select("file_path")
  .eq("file_path", cachedPdfPath)
  .eq("file_kind", "pdf")
  .order("created_at", { ascending: false })
  .limit(1);

  if (!cachedExport.error && cachedExport.data?.length > 0) {
   const { filename } = buildDeliverableHeaders({
    rubrique:"reports_elus_dossier",
    extension:"pdf",
    contentType:"application/pdf",
   });
   const signedPdf = await supabase.storage.from(ELUS_DOSSIER_BUCKET).createSignedUrl(
    cachedPdfPath,
    60 * 60 * 24,
    {
     download: filename,
    },
   );

   if (!signedPdf.error && signedPdf.data?.signedUrl) {
     return new Response(null, {
      status: 302,
      headers: {
       Location: signedPdf.data.signedUrl,
       "Cache-Control": ELUS_DOSSIER_PDF_REDIRECT_CACHE_CONTROL,
      },
     });
    }
  }

  return new Response(
   JSON.stringify({
    error:
     "Le PDF de dossier élus est désormais généré côté navigateur. Utilisez l'export PDF depuis la page de rapports.",
   }),
   {
    // no-store: this fallback is per-request and must not be cached across admin sessions.
   status: 409,
   headers: {
     "Content-Type": "application/json; charset=utf-8",
     // no-store: this fallback is per-request and must not be cached across admin sessions.
     "Cache-Control": "no-store",
    },
   },
  );
 }

 const { items: contracts, isTruncated } = await fetchUnifiedActionContracts(
 supabase,
 {
 limit: Math.max(limit * 2, limit),
 status: null,
 floorDate,
 requireCoordinates: false,
 types: null,
 },
 );

 const scopeContracts = filterActionContractsByScope(contracts, {
  kind: scope.kind,
  value: scope.value,
 });

 const approved = scopeContracts.filter((contract) => contract.status ==="approved");
 const totalKg = sumApprovedMetric(approved, (contract) => contract.metadata.wasteKg);
 const totalActions = approved.length;
 const totalVolunteers = sumApprovedMetric(
  approved,
  (contract) => contract.metadata.volunteersCount,
 );
 const geolocated = countGeolocatedContracts(approved);

 const comparison = computePeriodComparison(
  scopeContracts.map((contract) => ({
 status: contract.status,
 observedAt: contract.dates.observedAt,
 createdAt: contract.dates.createdAt ?? contract.dates.importedAt,
 latitude: contract.location.latitude,
 longitude: contract.location.longitude,
 wasteKg: contract.metadata.wasteKg,
 })),
 days,
 );

 const benchmark = buildTerritorialBenchmark(
  approved.map((contract) => ({
   locationLabel: contract.location.label,
   wasteKg: contract.metadata.wasteKg,
   volunteersCount: contract.metadata.volunteersCount,
  })),
 );
 const overview = buildPilotageOverviewFromContracts({
  contracts: scopeContracts,
  periodDays: days,
 });

 const qualityScores = approved.map((contract) =>
 evaluateActionQuality(toActionListItem(contract)).score,
 );
 const qualityAverage =
 qualityScores.length > 0
 ? qualityScores.reduce((acc, score) => acc + score, 0) /
 qualityScores.length
 : 0;
 const sharedMethodology = buildPersonalImpactMethodology(qualityAverage);
 const methodology = buildMethodology(sharedMethodology);
 const payload = {
 generatedAt: overview.generatedAt,
 periodDays: days,
 packVersion: methodology.version,
 summary: {
 totalActions,
 totalKg: Number(totalKg.toFixed(1)),
 totalVolunteers,
 geocoverageRate:
 totalActions > 0 ? Math.round((geolocated / totalActions) * 100) : 0,
 },
 comparison,
 territorialPriorities: benchmark,
 decisionPriorities: buildDecisionPriorities(benchmark),
 zoneComparisons: overview.zones,
 isTruncated,
 methodology,
 methodologyText: [
"Sources: actions/clean_place/spot unifiees sur la fenetre courante.",
"Comparatif: periode N vs N-1 sur actions, volume, couverture, delai moderation.",
"Benchmark: normalisation par surface, densite, volume d'actions et participation.",
"Lecture decisionnelle: priorisation haute/moyenne/fond selon score normalise.",
  ],
 };

 const { headers: responseHeaders } = buildDeliverableHeaders({
  rubrique:"reports_elus_dossier",
  extension: format === "md" ? "md" : "json",
  contentType: format === "md"
 ? "text/markdown; charset=utf-8"
    : "application/json; charset=utf-8",
  cacheControl: ELUS_DOSSIER_RESPONSE_CACHE_CONTROL,
 });
 const headers: Record<string, string> = { ...responseHeaders };
 if (isTruncated) {
 headers["X-Export-Warning"] ="Dataset truncated to limit";
 }

 if (format ==="md") {
 const markdown = buildMarkdownPack(payload);

 return new Response(markdown, {
 status: 200,
 headers,
 });
 }

 return new Response(JSON.stringify(payload, null, 2), {
 status: 200,
 headers,
 });
 } catch {
 return new Response("Export unavailable", { status: 500 });
 }
}
