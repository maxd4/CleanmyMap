import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  EngagementProofParticipationItem,
  PersonalEngagementProofProjection,
} from "./engagement-proof-projection.types";

export type EngagementDossierExportInput = {
  holderName?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  selectedActionIds?: readonly string[] | null;
  personalPresentation?: {
    motivations?: string | null;
    perceivedSkills?: string | null;
    observations?: string | null;
  } | null;
  complementaryDocuments?: {
    attestationReferences?: string | null;
    publicLinks?: string | null;
    otherDocuments?: string | null;
  } | null;
};

const TEMPLATE_RELATIVE_PATH = join(
  "src",
  "lib",
  "actions",
  "engagement-dossier-template.md",
);

function resolveTemplatePath(): string {
  const candidates = [
    join(process.cwd(), TEMPLATE_RELATIVE_PATH),
    join(process.cwd(), "apps", "web", TEMPLATE_RELATIVE_PATH),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Modèle éditorial du dossier bénévole introuvable.");
  }
  return found;
}

export function loadEngagementDossierTemplate(): string {
  return readFileSync(resolveTemplatePath(), "utf8");
}

export function escapeMarkdownInline(value: string): string {
  return value
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([\\`*_{}[\]()#+!|<>])/g, "\\$1");
}

export function escapeMarkdownTableCell(value: string): string {
  return escapeMarkdownInline(value);
}

function optionalTextOrFallback(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? escapeMarkdownInline(trimmed) : fallback;
}

function filterParticipations(
  participations: readonly EngagementProofParticipationItem[],
  input: EngagementDossierExportInput,
): EngagementProofParticipationItem[] {
  const selectedSet =
    Array.isArray(input.selectedActionIds) && input.selectedActionIds.length > 0
      ? new Set(input.selectedActionIds.map((id) => id.trim()).filter(Boolean))
      : null;

  const periodStart = input.periodStart?.trim() || null;
  const periodEnd = input.periodEnd?.trim() || null;

  return participations.filter((item) => {
    const date = item.actionDate.slice(0, 10);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    if (selectedSet && !selectedSet.has(item.actionId)) return false;
    return true;
  });
}

function formatParticipationTableRow(item: EngagementProofParticipationItem): string {
  const dateCell = escapeMarkdownTableCell(item.actionDate.slice(0, 10));
  const actionLabel = item.actionTitle
    ? `${item.actionTitle} — ${item.locationLabel}`
    : item.locationLabel;
  const actionCell = escapeMarkdownTableCell(actionLabel);
  const orgCell = item.organization.value
    ? escapeMarkdownTableCell(
        `${item.organization.value.name} (${item.organization.value.organizerTypeLabel})`,
      )
    : "non documentée";
  const presenceCell = `Confirmée (${escapeMarkdownTableCell(item.presence.participationSource)})`;
  const missionCell =
    item.attestedMissions.length > 0
      ? escapeMarkdownTableCell(
          item.attestedMissions
            .map((mission) => `${mission.roleLabel} [${mission.evidenceReference}]`)
            .join(" ; "),
        )
      : "non documentée";
  const hoursCell = "non documentées";
  const refCell = escapeMarkdownTableCell(
    `${item.communicableReference.referenceCode} (${item.presence.confirmedAt.slice(0, 10)})`,
  );

  return `| ${dateCell} | ${actionCell} | ${orgCell} | ${presenceCell} | ${missionCell} | ${hoursCell} | ${refCell} |`;
}

function formatPersonalDeclarationLine(item: EngagementProofParticipationItem): string | null {
  const declaration = item.personalDeclaration.value;
  if (!declaration) return null;
  const parts: string[] = [];
  if (declaration.wasteKg.value !== null) {
    parts.push(`${declaration.wasteKg.value} kg déclarés`);
  }
  if (declaration.cigaretteButtsCount.value !== null) {
    parts.push(`${declaration.cigaretteButtsCount.value} mégots déclarés`);
  }
  if (parts.length === 0) return null;
  return `${item.actionDate.slice(0, 10)} (${parts.join(", ")})`;
}

function buildOrganizationSections(
  participations: readonly EngagementProofParticipationItem[],
): string {
  if (participations.length === 0) {
    return [
      "### Aucune structure documentée dans la sélection",
      "",
      "- **Actions concernées** : non documentées",
      "- **Missions vérifiées par une personne habilitée** : non documentées",
      "- **Fréquence / continuité attestée par l'organisme** : non documentée",
      "- **Compétences observées et attestées** : non documentées",
      "- **Attestation de l'organisme** : non jointe",
    ].join("\n");
  }

  const grouped = new Map<
    string,
    { heading: string; items: EngagementProofParticipationItem[] }
  >();

  for (const item of participations) {
    const key = item.organization.value?.organizationKey ?? "__unidentified__";
    const heading = item.organization.value
      ? `${item.organization.value.name} (${item.organization.value.organizerTypeLabel})`
      : "Structure organisatrice non documentée";
    const existing = grouped.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      grouped.set(key, { heading, items: [item] });
    }
  }

  return [...grouped.values()]
    .map((group) => {
      const actionRefs = group.items
        .map(
          (item) =>
            `${item.actionDate.slice(0, 10)} (${item.communicableReference.referenceCode})`,
        )
        .join(" ; ");
      const missions = group.items.flatMap((item) => item.attestedMissions);
      const missionsLine =
        missions.length > 0
          ? escapeMarkdownInline(
              missions
                .map((mission) => `${mission.roleLabel} [${mission.evidenceReference}]`)
                .join(" ; "),
            )
          : "non documentées";
      const personalDeclarations = group.items
        .map(formatPersonalDeclarationLine)
        .filter((line): line is string => line !== null);

      const lines = [
        `### ${escapeMarkdownInline(group.heading)}`,
        "",
        `- **Actions concernées** : ${escapeMarkdownInline(actionRefs)}`,
        `- **Missions vérifiées par une personne habilitée** : ${missionsLine}`,
        "- **Fréquence / continuité attestée par l'organisme** : non documentée",
        "- **Compétences observées et attestées** : non documentées",
        "- **Attestation de l'organisme** : non jointe",
      ];

      if (personalDeclarations.length > 0) {
        lines.push(
          `- **Déclarations individuelles enregistrées (non certifiées)** : ${escapeMarkdownInline(personalDeclarations.join(" ; "))}`,
        );
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildDossierId(
  generatedAt: string,
  participations: readonly EngagementProofParticipationItem[],
): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        generatedAt,
        references: participations.map(
          (item) => item.communicableReference.sourceRevisionFingerprint,
        ),
      }),
      "utf8",
    )
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  const datePart = generatedAt.slice(0, 10).replace(/[^0-9]/g, "");
  return `CMM-DOSSIER-${datePart || "00000000"}-${digest}`;
}

export function renderEngagementDossierMarkdown(params: {
  projection: PersonalEngagementProofProjection;
  input: EngagementDossierExportInput;
}): string {
  const { projection, input } = params;
  if (projection.status !== "available" || !projection.participations.value) {
    throw new Error(
      "Impossible de générer le dossier Markdown : la projection canonique est indisponible.",
    );
  }

  const selected = filterParticipations(projection.participations.value, input);
  const dates = selected.map((item) => item.actionDate.slice(0, 10)).sort();
  const firstDate = dates[0] ?? null;
  const lastDate = dates[dates.length - 1] ?? null;

  const periodStart = input.periodStart?.trim() || firstDate;
  const periodEnd = input.periodEnd?.trim() || lastDate;
  const periodRange =
    periodStart && periodEnd
      ? `${escapeMarkdownInline(periodStart)} au ${escapeMarkdownInline(periodEnd)}`
      : "non documentée";

  const documentedPeriod =
    firstDate && lastDate
      ? `${escapeMarkdownInline(firstDate)} au ${escapeMarkdownInline(lastDate)} (actions ponctuelles confirmées ; ne prouve pas une présence continue)`
      : "non documentée";

  const orgNames = [
    ...new Set(
      selected
        .map((item) => item.organization.value?.name ?? null)
        .filter((name): name is string => name !== null),
    ),
  ];

  const attestedMissionsCount = selected.reduce(
    (sum, item) => sum + item.attestedMissions.length,
    0,
  );

  const tableRows =
    selected.length > 0
      ? selected.map(formatParticipationTableRow).join("\n")
      : "| non documentée | Aucune participation confirmée sélectionnée | non documentée | non documentée | non documentée | non documentées | non documentée |";

  const replacements: Record<string, string> = {
    "{{HOLDER_NAME}}": optionalTextOrFallback(input.holderName, "non documenté"),
    "{{GENERATED_AT}}": escapeMarkdownInline(projection.generatedAt),
    "{{PERIOD_RANGE}}": periodRange,
    "{{DOSSIER_ID}}": buildDossierId(projection.generatedAt, selected),
    "{{CONFIRMED_ACTIONS_COUNT}}": String(selected.length),
    "{{ORGANIZATIONS_SUMMARY}}":
      orgNames.length > 0
        ? escapeMarkdownInline(orgNames.join(", "))
        : "non documentées",
    "{{ATTESTED_MISSIONS_COUNT}}": String(attestedMissionsCount),
    "{{VERIFIED_HOURS_SUMMARY}}":
      "non documenté (aucune mesure individuelle d’heures vérifiée ; la durée annoncée d’une action n’est pas comptabilisée)",
    "{{DOCUMENTED_PERIOD}}": documentedPeriod,
    "{{PARTICIPATIONS_TABLE_ROWS}}": tableRows,
    "{{ORGANIZATION_SECTIONS}}": buildOrganizationSections(selected),
    "{{MOTIVATIONS_TEXT}}": optionalTextOrFallback(
      input.personalPresentation?.motivations,
      "non documenté",
    ),
    "{{SKILLS_TEXT}}": optionalTextOrFallback(
      input.personalPresentation?.perceivedSkills,
      "non documenté",
    ),
    "{{OBSERVATIONS_TEXT}}": optionalTextOrFallback(
      input.personalPresentation?.observations,
      "non documenté",
    ),
    "{{ATTESTATION_REFS}}": optionalTextOrFallback(
      input.complementaryDocuments?.attestationReferences,
      "non jointe",
    ),
    "{{PUBLIC_LINKS}}": optionalTextOrFallback(
      input.complementaryDocuments?.publicLinks,
      "non documentés",
    ),
    "{{OTHER_DOCS}}": optionalTextOrFallback(
      input.complementaryDocuments?.otherDocuments,
      "non documenté",
    ),
  };

  let rendered = loadEngagementDossierTemplate();
  for (const [token, value] of Object.entries(replacements)) {
    rendered = rendered.split(token).join(value);
  }

  return rendered;
}
