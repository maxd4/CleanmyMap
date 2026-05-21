import type { StorageBusinessDomainId } from "@/lib/supabase/storage-business-taxonomy";
import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import type { StorageUsageReport } from "@/lib/supabase/storage-usage-service";
import type { GovernanceMonthlyReportPayload } from "./governance-monthly-report-store";

export type GovernanceStorageContributionItem =
  GovernanceMonthlyReportPayload["storage"]["businessContributions"]["items"][number];

function getStorageContributionGrowthScore(item: GovernanceStorageContributionItem): number {
  if (item.deltaBytes <= 0) {
    return item.deltaBytes;
  }

  if (item.deltaPercent === null) {
    return Number.POSITIVE_INFINITY;
  }

  return item.deltaPercent;
}

export function getFastestGrowingContribution(
  items: GovernanceStorageContributionItem[],
): GovernanceStorageContributionItem | null {
  const candidates = items.filter((item) => item.deltaBytes > 0);
  const pool = candidates.length > 0 ? candidates : items;

  return pool.slice().sort((left, right) => {
    const leftScore = getStorageContributionGrowthScore(left);
    const rightScore = getStorageContributionGrowthScore(right);
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    if (right.deltaBytes !== left.deltaBytes) {
      return right.deltaBytes - left.deltaBytes;
    }
    return left.label.localeCompare(right.label, "fr");
  })[0] ?? null;
}

export function formatContributionGrowth(item: GovernanceStorageContributionItem): string {
  if (item.deltaBytes === 0) {
    return "stable";
  }

  if (item.deltaBytes < 0) {
    return `en baisse de ${formatStorageBytes(Math.abs(item.deltaBytes))}`;
  }

  if (item.deltaPercent === null) {
    return `nouvelle catégorie (+${formatStorageBytes(item.deltaBytes)})`;
  }

  return `+${item.deltaPercent.toFixed(1)}% (+${formatStorageBytes(item.deltaBytes)})`;
}

export function buildStorageContributionHighlights(report: StorageUsageReport): string[] {
  const items = report.businessContributions.items.slice(0, 5);
  if (items.length === 0) {
    return ["- Aucune catégorie métier disponible."];
  }

  const lines: string[] = [];

  for (const item of items) {
    const sign = item.deltaBytes > 0 ? "+" : item.deltaBytes < 0 ? "-" : "";
    lines.push(
      `- ${item.label}: ${formatStorageBytes(item.currentBytes)} (${item.currentCount} fichier${item.currentCount > 1 ? "s" : ""}, ${sign}${formatStorageBytes(Math.abs(item.deltaBytes))} sur le mois, ${item.currentSharePercent.toFixed(1)}% du total)`,
    );

    if (item.topFiles.length > 0) {
      const topFiles = item.topFiles
        .slice(0, 2)
        .map((file) => `${file.name} (${file.sizeLabel})`)
        .join(", ");
      lines.push(`  - Top fichiers: ${topFiles}`);
    }
  }

  return lines;
}

function buildContributionItemLines(item: GovernanceStorageContributionItem): string[] {
  const topFiles = item.topFiles
    .slice(0, 2)
    .map((file) => `${file.name} (${file.sizeLabel})`);
  const mimeSubtypes = item.mimeSubtypes
    .slice(0, 3)
    .map(
      (mime) =>
        `${mime.label} ${formatStorageBytes(mime.bytes)} (${mime.count} fichier${mime.count > 1 ? "s" : ""})`,
    );

  return [
    `- Taille totale: ${formatStorageBytes(item.currentBytes)} (${item.currentCount} fichier${item.currentCount > 1 ? "s" : ""}, ${item.currentSharePercent.toFixed(1)}% du total)`,
    `- Evolution mensuelle: ${formatContributionGrowth(item)}`,
    `- Cumul 3 mois: ${formatStorageBytes(item.cumulative3MonthBytes)} (${item.cumulative3MonthPercent === null ? "n/a" : `${item.cumulative3MonthPercent.toFixed(1)}%`})`,
    `- Accélération: ${formatStorageBytes(item.accelerationBytes)} (${item.accelerationPercent === null ? "n/a" : `${item.accelerationPercent.toFixed(1)}%`})`,
    item.history.length > 0
      ? `- Historique 3 mois: ${item.history.slice(0, 3).map((point) => `${point.monthLabel} ${formatStorageBytes(point.currentBytes)}`).join(" | ")}`
      : "- Historique 3 mois: aucune donnée.",
    item.topFiles.length > 0
      ? `- Top fichiers: ${topFiles.join(", ")}`
      : "- Top fichiers: aucun fichier majeur identifié.",
    item.mimeSubtypes.length > 0
      ? `- Sous-types MIME: ${mimeSubtypes.join(", ")}`
      : "- Sous-types MIME: aucun sous-type identifié.",
    item.alerts.length > 0
      ? `- Alertes: ${item.alerts.slice(0, 2).map((alert) => alert.title).join(", ")}`
      : "- Alertes: aucune alerte sur cette catégorie.",
  ];
}

function buildBusinessBlockPage(
  title: string,
  items: GovernanceStorageContributionItem[],
  intro?: string,
): string[] {
  const lines: string[] = [title];

  if (intro) {
    lines.push(intro);
  }

  if (items.length === 0) {
    lines.push("- Aucune donnée métier disponible.");
    return lines;
  }

  for (const item of items) {
    lines.push("");
    lines.push(`### ${item.label}`);
    lines.push(...buildContributionItemLines(item));
  }

  return lines;
}

export function buildBusinessBlockByIds(
  title: string,
  items: GovernanceStorageContributionItem[],
  ids: Array<StorageBusinessDomainId>,
  intro?: string,
): string[] {
  const selected = ids
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is GovernanceStorageContributionItem => Boolean(item));

  return buildBusinessBlockPage(title, selected, intro);
}
