import { computePeriodComparison } from "@/lib/analytics/period-comparison";
import {
  buildTerritorialBenchmark,
  type TerritorialBenchmarkRow,
} from "@/lib/analytics/territorial-benchmark";
import { toActionListItem } from "@/lib/actions/data-contract";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import {
  buildPersonalImpactMethodology,
} from "@/lib/gamification/progression-impact";
import type { PersonalImpactMethodology } from "@/lib/gamification/progression-types";
import { buildPilotageOverviewFromContracts } from "@/lib/pilotage/overview";
import type { ZoneComparisonRow } from "@/lib/pilotage/prioritization";
import { buildDeliverableFilename } from "@/lib/reports/deliverable-name";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ExportFormat = "json" | "md" | "pdf";

function parsePositiveInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function parseExportFormat(raw: string | null): ExportFormat {
  if (raw === "md" || raw === "pdf") {
    return raw;
  }
  return "json";
}

function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

function buildDecisionPriorities(rows: TerritorialBenchmarkRow[]): Array<{
  area: string;
  urgency: "haute" | "moyenne" | "fond";
  reason: string;
  normalizedScore: number;
}> {
  return rows.slice(0, 5).map((row) => {
    const urgency =
      row.decisionLabel === "Priorite haute"
        ? "haute"
        : row.decisionLabel === "Priorite moyenne"
          ? "moyenne"
          : "fond";
    const reason =
      urgency === "haute"
        ? `Pression forte (${row.actionsPerKm2} act/km2, ${row.kgPerKm2} kg/km2).`
        : urgency === "moyenne"
          ? `Zone active a stabiliser (${row.actionsPerKm2} act/km2).`
          : "Surveillance reguliere suffisante sur la periode.";
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
    version: "elus-pack-v2.2",
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
        `- ${zone.area}: actions ${zone.currentActions}/${zone.previousActions} (${zone.deltaActionsAbsolute >= 0 ? "+" : ""}${zone.deltaActionsAbsolute.toFixed(1)} ; ${zone.deltaActionsPercent.toFixed(1)}%), kg ${zone.currentKg.toFixed(1)}/${zone.previousKg.toFixed(1)} (${zone.deltaKgAbsolute >= 0 ? "+" : ""}${zone.deltaKgAbsolute.toFixed(1)} ; ${zone.deltaKgPercent.toFixed(1)}%), couverture ${zone.currentCoverageRate.toFixed(1)}%/${zone.previousCoverageRate.toFixed(1)}% (${zone.deltaCoverageRateAbsolute >= 0 ? "+" : ""}${zone.deltaCoverageRateAbsolute.toFixed(1)} pt), delai moderation ${zone.currentModerationDelayDays.toFixed(1)}j/${zone.previousModerationDelayDays.toFixed(1)}j (${zone.deltaModerationDelayDaysAbsolute >= 0 ? "+" : ""}${zone.deltaModerationDelayDaysAbsolute.toFixed(1)}j). Action: ${zone.recommendedAction}`,
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
    priorities || "- Aucune priorite detectee.",
    "",
    "## Benchmark territorial (normalise)",
    territorial || "- Donnees insuffisantes.",
    "",
    "## Comparatif zone par zone (courant vs precedent)",
    zoneComparisons || "- Donnees zonales insuffisantes.",
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

function sanitizeLineForPdf(value: string): string {
  return value
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^#\s+/g, "")
    .replace(/^##\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\t/g, "    ");
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function buildSimplePdf(lines: string[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 40;
  const marginTop = 40;
  const lineHeight = 14;
  const usableHeight = pageHeight - marginTop * 2;
  const maxLinesPerPage = Math.max(20, Math.floor(usableHeight / lineHeight));
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }
  if (pages.length === 0) {
    pages.push(["Dossier elu - Donnees indisponibles"]);
  }

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const baseObjectId = 3;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const pageObjectId = baseObjectId + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    contentObjectIds.push(contentObjectId);
  }
  const fontObjectId = baseObjectId + pages.length * 2;

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  const objectById = new Map<number, string>();
  objectById.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objectById.set(
    2,
    `<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>`,
  );

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const pageObjectId = pageObjectIds[pageIndex];
    const contentObjectId = contentObjectIds[pageIndex];
    objectById.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );

    const pageLines = pages[pageIndex];
    let y = pageHeight - marginTop;
    const textOps: string[] = ["BT", "/F1 11 Tf"];
    for (const rawLine of pageLines) {
      const line = escapePdfText(rawLine);
      textOps.push(`1 0 0 1 ${marginX} ${y} Tm (${line}) Tj`);
      y -= lineHeight;
    }
    textOps.push("ET");
    const streamContent = textOps.join("\n");
    objectById.set(
      contentObjectId,
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
    );
  }
  objectById.set(
    fontObjectId,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  let currentOffset = pdf.length;
  const maxObjectId = fontObjectId;
  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    const body = objectById.get(objectId);
    if (!body) {
      throw new Error(`PDF object ${objectId} missing`);
    }
    const object = `${objectId} 0 obj\n${body}\nendobj\n`;
    offsets[objectId] = currentOffset;
    pdf += object;
    currentOffset += object.length;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${maxObjectId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    const offset = offsets[objectId] ?? 0;
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
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

  try {
    const supabase = getSupabaseServerClient();
    const { items: contracts, isTruncated } = await fetchUnifiedActionContracts(
      supabase,
      {
        limit,
        status: null,
        floorDate,
        requireCoordinates: false,
        types: null,
      },
    );

    const approved = contracts.filter(
      (contract) => contract.status === "approved",
    );
    const totalKg = approved.reduce(
      (acc, contract) => acc + Number(contract.metadata.wasteKg || 0),
      0,
    );
    const totalActions = approved.length;
    const totalVolunteers = approved.reduce(
      (acc, contract) => acc + Number(contract.metadata.volunteersCount || 0),
      0,
    );
    const geolocated = approved.filter(
      (contract) =>
        contract.location.latitude !== null &&
        contract.location.longitude !== null,
    ).length;

    const comparison = computePeriodComparison(
      contracts.map((contract) => ({
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
      contracts,
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

    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
    };
    if (isTruncated) {
      headers["X-Export-Warning"] = "Dataset truncated to limit";
    }

    if (format === "pdf") {
      const filename = buildDeliverableFilename({
        rubrique: "reports_elus_dossier",
        extension: "pdf",
        date: new Date(),
      });
      const markdown = buildMarkdownPack(payload);
      const lines = markdown
        .split("\n")
        .map((line) => sanitizeLineForPdf(line))
        .filter((line) => line.trim().length > 0);
      const pdfBytes = buildSimplePdf(lines);
      const pdfBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer;

      headers["Content-Type"] = "application/pdf";
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;

      return new Response(pdfBuffer, {
        status: 200,
        headers,
      });
    }

    if (format === "md") {
      const filename = buildDeliverableFilename({
        rubrique: "reports_elus_dossier",
        extension: "md",
        date: new Date(),
      });
      const markdown = buildMarkdownPack(payload);

      headers["Content-Type"] = "text/markdown; charset=utf-8";
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;

      return new Response(markdown, {
        status: 200,
        headers,
      });
    }

    const filename = buildDeliverableFilename({
      rubrique: "reports_elus_dossier",
      extension: "json",
      date: new Date(),
    });

    headers["Content-Type"] = "application/json; charset=utf-8";
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Export error: ${message}`, { status: 500 });
  }
}
