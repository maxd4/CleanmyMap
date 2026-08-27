import type { ActionListItem } from "@/lib/actions/types";
import type { ActionEditorRecord } from "./http";
import { evaluateActionQuality } from "./quality/quality";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

export type PostActionImpactMetric = {
  id: "co2" | "water" | "surface";
  label: string;
  value: number;
  unit: string;
  method: string;
  confidence: number;
};

export type PostActionSummary = {
  action: {
    id: string;
    status: ActionEditorRecord["status"];
    locationLabel: string;
    actionDate: string;
    wasteKg: number;
    cigaretteButts: number;
    volunteersCount: number;
    durationMinutes: number;
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

function toNonNegativeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
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
  const cigaretteButts = Math.trunc(toNonNegativeNumber(action.cigaretteButts));
  const volunteersCount = Math.max(1, Math.trunc(toNonNegativeNumber(action.volunteersCount)));
  const durationMinutes = Math.trunc(toNonNegativeNumber(action.durationMinutes));
  const quality = evaluateActionQuality(toActionListItem(action));
  const factors = IMPACT_PROXY_CONFIG.factors;

  return {
    action: {
      id: action.id,
      status: action.status,
      locationLabel: action.locationLabel,
      actionDate: action.actionDate,
      wasteKg: round(wasteKg),
      cigaretteButts,
      volunteersCount,
      durationMinutes,
    },
    quality: {
      score: quality.score,
      grade: quality.grade,
      rulesVersion: quality.rulesVersion ?? "unknown",
    },
    impact: [
      {
        id: "co2",
        label: "CO₂e évité",
        value: round(wasteKg * factors.co2KgPerWasteKg),
        unit: "kg CO₂e",
        method: `Proxy ${IMPACT_PROXY_CONFIG.version} · déchets enregistrés × ${factors.co2KgPerWasteKg} kg CO₂e/kg`,
        confidence: quality.score,
      },
      {
        id: "water",
        label: "Eau protégée",
        value: Math.round(cigaretteButts * factors.waterLitersPerCigaretteButt),
        unit: "L",
        method: `Proxy ${IMPACT_PROXY_CONFIG.version} · mégots enregistrés × ${factors.waterLitersPerCigaretteButt} L/mégot`,
        confidence: quality.score,
      },
      {
        id: "surface",
        label: "Surface nettoyée",
        value: round(
          wasteKg * factors.surfaceM2PerWasteKg +
            durationMinutes * volunteersCount * factors.surfaceM2PerVolunteerMinute,
        ),
        unit: "m²",
        method: `Proxy ${IMPACT_PROXY_CONFIG.version} · poids + temps bénévole`,
        confidence: quality.score,
      },
    ],
    impactStatus: action.status === "approved" ? "validated" : "provisional",
    methodology: {
      version: IMPACT_PROXY_CONFIG.version,
      label: "Proxys versionnés, non mesures instrumentales",
    },
  };
}
