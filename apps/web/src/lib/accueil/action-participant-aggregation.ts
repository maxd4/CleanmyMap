import type { ActionDataContract } from "@/lib/actions/data-contract";
import {
  isOrganizerType,
  type OrganizerType,
} from "@/lib/actions/organizer-type";
import {
  buildImpactTerrain2026PublicResultsFromActions,
  buildImpactTerrain2026PublicResultsFromAggregate,
  type ImpactTerrain2026PublicResults,
} from "@/lib/impact/impact-terrain-2026-results";
import {
  computeImpactTerrain2026StreetCleaningSavings,
  type ImpactTerrain2026StreetCleaningSavings,
} from "@/lib/impact/impact-terrain-2026";

export type ActionAggregationAction = {
  metadata: Pick<
    ActionDataContract["metadata"],
    "volunteersCount" | "durationMinutes"
  > & {
    organizerType?: OrganizerType | null;
    volunteersCount?: number | null;
    durationMinutes?: number | null;
    wasteKg?: number | null;
    cigaretteButts?: number | null;
    wasteBreakdown?: ActionDataContract["metadata"]["wasteBreakdown"];
  };
};

export type ActionDistributionEntry = {
  key: string;
  category: string;
  count: number;
};

export type ActionAggregationWarning = {
  code: string;
  count: number;
};

export type PublicLandingActionAggregation = {
  participantsTotal: number;
  totalDurationMinutes: number;
  totalDurationHours: number;
  actionDistribution: ActionDistributionEntry[];
  classificationWarnings: ActionAggregationWarning[];
  streetCleaningSavings: ImpactTerrain2026StreetCleaningSavings;
  impactTerrain: ImpactTerrain2026PublicResults;
};

type Classification = {
  entry: Omit<ActionDistributionEntry, "count">;
  warningCode?: string;
};

const STRUCTURED_CATEGORIES: Record<
  Exclude<OrganizerType, "spontaneous">,
  Omit<ActionDistributionEntry, "count">
> = {
  company: { key: "company", category: "Entreprise" },
  association: { key: "association", category: "Association" },
  student_association: {
    key: "student_association",
    category: "Association étudiante",
  },
  collective: { key: "collective", category: "Collectif" },
  other: { key: "other", category: "Autres" },
};

const SPONTANEOUS_GROUP_NAMES: Record<number, string> = {
  1: "Solo",
  2: "Duo",
  3: "Trio",
  4: "Quatuor",
  5: "Quintet",
  6: "Sextet",
  7: "Septet",
  8: "Octet",
  9: "Nonet",
  10: "Décet",
  11: "Undécet",
  12: "Duodécet",
};

function toFiniteNonNegativeInteger(value: number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function getSpontaneousActionCategory(
  volunteersCount: number,
): Omit<ActionDistributionEntry, "count"> | null {
  const count = toFiniteNonNegativeInteger(volunteersCount);
  if (count < 1) {
    return null;
  }

  return {
    key: `spontaneous:${count}`,
    category:
      SPONTANEOUS_GROUP_NAMES[count] ?? `Groupe de ${count} participants`,
  };
}

export function classifyActionForDistribution(
  action: ActionAggregationAction,
): Classification {
  const organizerType = action.metadata.organizerType;

  if (organizerType === "spontaneous") {
    const category = getSpontaneousActionCategory(
      action.metadata.volunteersCount,
    );
    if (category) {
      return { entry: category };
    }

    return {
      entry: STRUCTURED_CATEGORIES.other,
      warningCode: "invalid_spontaneous_participant_count",
    };
  }

  if (isOrganizerType(organizerType)) {
    return { entry: STRUCTURED_CATEGORIES[organizerType] };
  }

  return {
    entry: STRUCTURED_CATEGORIES.other,
    warningCode:
      organizerType === null || organizerType === undefined
        ? "missing_organizer_type"
        : "invalid_organizer_type",
  };
}

function compareDistributionEntries(
  left: ActionDistributionEntry,
  right: ActionDistributionEntry,
): number {
  const leftSpontaneous = left.key.startsWith("spontaneous:");
  const rightSpontaneous = right.key.startsWith("spontaneous:");
  if (leftSpontaneous && rightSpontaneous) {
    return Number(left.key.split(":")[1]) - Number(right.key.split(":")[1]);
  }
  if (leftSpontaneous !== rightSpontaneous) {
    return leftSpontaneous ? -1 : 1;
  }
  return left.category.localeCompare(right.category, "fr");
}

export function aggregatePublicActionMetrics(
  actions: readonly ActionAggregationAction[],
): PublicLandingActionAggregation {
  let participantsTotal = 0;
  let totalDurationMinutes = 0;
  const distribution = new Map<string, ActionDistributionEntry>();
  const warnings = new Map<string, number>();

  for (const action of actions) {
    participantsTotal += toFiniteNonNegativeInteger(
      action.metadata.volunteersCount,
    );
    totalDurationMinutes += toFiniteNonNegativeInteger(
      action.metadata.durationMinutes,
    );

    const classification = classifyActionForDistribution(action);
    const current = distribution.get(classification.entry.key);
    distribution.set(classification.entry.key, {
      ...classification.entry,
      count: (current?.count ?? 0) + 1,
    });

    if (classification.warningCode) {
      warnings.set(
        classification.warningCode,
        (warnings.get(classification.warningCode) ?? 0) + 1,
      );
    }
  }

  const impactTerrain = buildImpactTerrain2026PublicResultsFromActions(
    actions.map((action) => action.metadata),
  );

  return {
    participantsTotal,
    totalDurationMinutes,
    totalDurationHours: totalDurationMinutes / 60,
    actionDistribution: [...distribution.values()]
      .filter((entry) => entry.count > 0)
      .sort(compareDistributionEntries),
    classificationWarnings: [...warnings.entries()]
      .filter(([, count]) => count > 0)
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => left.code.localeCompare(right.code)),
    streetCleaningSavings: computeImpactTerrain2026StreetCleaningSavings({
      wasteKg: impactTerrain.wasteKg,
      durationMinutes: totalDurationMinutes,
    }),
    impactTerrain,
  };
}

export type PublicLandingActionAggregationRow = {
  participants_total?: number | string | null;
  volunteers?: number | string | null;
  total_duration_minutes?: number | string | null;
  action_distribution?: unknown;
  classification_warnings?: unknown;
  waste_kg?: number | string | null;
  cigarette_butts?: number | string | null;
  butts_by_condition?: unknown;
};

function toFiniteNonNegativeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function buildPublicLandingActionMetricsFromAggregate(
  row: PublicLandingActionAggregationRow,
): PublicLandingActionAggregation {
  const participantsTotal = toFiniteNonNegativeNumber(
    row.participants_total ?? row.volunteers,
  );
  const totalDurationMinutes = toFiniteNonNegativeNumber(
    row.total_duration_minutes,
  );
  const actionDistribution = Array.isArray(row.action_distribution)
    ? row.action_distribution
        .filter(
          (entry): entry is Record<string, unknown> =>
            typeof entry === "object" && entry !== null,
        )
        .map((entry) => ({
          key: typeof entry.key === "string" ? entry.key : "",
          category:
            typeof entry.category === "string" ? entry.category : "",
          count: toFiniteNonNegativeNumber(entry.count),
        }))
        .filter((entry) => entry.key && entry.category && entry.count > 0)
        .sort(compareDistributionEntries)
    : [];
  const classificationWarnings = Array.isArray(row.classification_warnings)
    ? row.classification_warnings
        .filter(
          (entry): entry is Record<string, unknown> =>
            typeof entry === "object" && entry !== null,
        )
        .map((entry) => ({
          code: typeof entry.code === "string" ? entry.code : "",
          count: toFiniteNonNegativeNumber(entry.count),
        }))
        .filter((entry) => entry.code && entry.count > 0)
        .sort((left, right) => left.code.localeCompare(right.code))
    : [];

  return {
    participantsTotal,
    totalDurationMinutes,
    totalDurationHours: totalDurationMinutes / 60,
    actionDistribution,
    classificationWarnings,
    streetCleaningSavings: computeImpactTerrain2026StreetCleaningSavings({
      wasteKg: Number(row.waste_kg ?? 0),
      durationMinutes: totalDurationMinutes,
    }),
    impactTerrain: buildImpactTerrain2026PublicResultsFromAggregate({
      wasteKg: row.waste_kg,
      cigaretteButts: row.cigarette_butts,
      buttsByCondition: row.butts_by_condition,
    }),
  };
}
