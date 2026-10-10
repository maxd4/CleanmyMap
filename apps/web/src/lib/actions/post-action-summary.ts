import type { ActionListItem } from "@/lib/actions/types";
import type { ActionEditorRecord } from "./http";
import {
  buildPostActionImpactMetrics,
  type PostActionImpactMetric,
} from "./post-action-summary-impact";
import { evaluateActionQuality } from "./quality/quality";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { resolveEffectiveVolunteerUnits } from "./volunteer-participation";

export type PostActionSummary = {
  action: {
    id: string;
    status: ActionEditorRecord["status"];
    locationLabel: string;
    actionDate: string;
    wasteKg: number | null;
    cigaretteButts: number | null;
    volunteersCount: number;
    effectiveVolunteerUnits: number | null;
    durationMinutes: number | null;
  };
  quality: {
    score: number;
    grade: "A" | "B" | "C";
    rulesVersion: string;
  };
  impact: PostActionImpactMetric[];
  impactStatus: "validated" | "provisional";
  methodology: {
    version: string;
    label: string;
  };
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundNullable(value: number | null, digits = 1): number | null {
  return value === null ? null : round(value, digits);
}

function toNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function toActionListItem(action: ActionEditorRecord): ActionListItem {
  return {
    id: action.id,
    created_at: action.createdAt,
    actor_name: action.actorName,
    action_date: action.actionDate,
    location_label: action.locationLabel,
    latitude: action.latitude,
    longitude: action.longitude,
    waste_kg: action.wasteKg,
    cigarette_butts: action.cigaretteButts,
    volunteers_count: action.volunteersCount,
    duration_minutes: action.durationMinutes,
    notes: action.notes,
    status: action.status,
    source: "actions",
    manual_drawing: action.manualDrawing ?? null,
  };
}

export function buildPostActionSummary(
  action: ActionEditorRecord,
): PostActionSummary {
  const wasteKg = toNonNegativeNumber(action.wasteKg);
  const cigaretteButtsValue = toNonNegativeNumber(action.cigaretteButts);
  const cigaretteButts = cigaretteButtsValue === null ? null : Math.trunc(cigaretteButtsValue);
  const volunteersValue = toNonNegativeNumber(action.volunteersCount);
  const volunteersCount = Math.max(1, Math.trunc(volunteersValue ?? 0));
  const effectiveVolunteerUnits = resolveEffectiveVolunteerUnits(
    action.volunteerParticipation,
  );
  const operationalVolunteerUnits = effectiveVolunteerUnits ?? volunteersCount;
  const durationValue = toNonNegativeNumber(action.durationMinutes);
  const durationMinutes = durationValue === null ? null : Math.trunc(durationValue);
  const quality = evaluateActionQuality(toActionListItem(action));
  return {
    action: {
      id: action.id,
      status: action.status,
      locationLabel: action.locationLabel,
      actionDate: action.actionDate,
      wasteKg: roundNullable(wasteKg),
      cigaretteButts,
      volunteersCount,
      effectiveVolunteerUnits,
      durationMinutes,
    },
    quality: {
      score: quality.score,
      grade: quality.grade,
      rulesVersion: quality.rulesVersion ?? "unknown",
    },
    impact: buildPostActionImpactMetrics({
      wasteKg,
      cigaretteButts,
      durationMinutes,
      operationalVolunteerUnits,
      qualityScore: quality.score,
    }),
    impactStatus: action.status === "approved" ? "validated" : "provisional",
    methodology: {
      version: IMPACT_PROXY_CONFIG.version,
      label: "Proxys versionnés, non mesures instrumentales",
    },
  };
}
