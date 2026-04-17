import { evaluateActionQuality } from "../actions/quality";
import type { ActionMapItem, ActionListItem } from "../actions/types";

export type AlertSeverity = "high" | "medium" | "low";

export type BusinessAlert = {
  id: string;
  title: string;
  severity: AlertSeverity;
  ageLabel: string;
  impactLabel: string;
  actionHref: string;
  actionLabel: string;
};

export type CampaignZoneGoal = {
  area: string;
  priority: "haute" | "moyenne" | "faible";
  baselineActions90d: number;
  baselineKg90d: number;
  targetActions30d: number;
  targetKg30d: number;
  targetVolunteers30d: number;
  justification: string;
};

export type NeighborhoodCampaignPlan = {
  area: string;
  priority: CampaignZoneGoal["priority"];
  targetActions30d: number;
  targetKg30d: number;
  targetVolunteers30d: number;
  weeklyCadence: number;
  staffingPerAction: number;
  qualityTargetScore: number;
  moderationSlaDays: number;
  checkpoint7d: string;
  checkpoint21d: string;
  rationale: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseMs(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): string {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return toIsoDate(copy);
}

function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

function oldestPendingDays(values: string[]): number {
  const nowMs = Date.now();
  const ages = values
    .map((createdAt) => {
      const createdMs = parseMs(createdAt);
      if (createdMs === null || createdMs > nowMs) {
        return null;
      }
      return (nowMs - createdMs) / DAY_MS;
    })
    .filter((value): value is number => value !== null);

  if (ages.length === 0) {
    return 0;
  }
  return round1(Math.max(...ages));
}

function severityRank(value: AlertSeverity): number {
  if (value === "high") {
    return 3;
  }
  if (value === "medium") {
    return 2;
  }
  return 1;
}

export function computeBusinessAlerts(params: {
  actions: ActionListItem[];
  mapItems: ActionMapItem[];
}): BusinessAlert[] {
  const output: BusinessAlert[] = [];
  const pending = params.actions.filter((item) => item.status === "pending");
  const pendingOldestDays = oldestPendingDays(
    pending.map((item) => item.created_at),
  );

  if (pending.length > 0) {
    const severity: AlertSeverity =
      pending.length >= 80 || pendingOldestDays >= 14
        ? "high"
        : pending.length >= 30 || pendingOldestDays >= 7
          ? "medium"
          : "low";
    output.push({
      id: "moderation-backlog",
      title: "Backlog moderation a traiter",
      severity,
      ageLabel: `Anciennete max ${pendingOldestDays.toFixed(1)} j`,
      impactLabel: `${pending.length} actions en attente`,
      actionHref: "/admin",
      actionLabel: "Traiter la file admin",
    });
  }

  const approved = params.actions.filter((item) => item.status === "approved");
  if (approved.length > 0) {
    const qualityScores = approved.map((item) => evaluateActionQuality(item));
    const averageQuality =
      qualityScores.reduce((acc, row) => acc + row.score, 0) /
      qualityScores.length;
    const gradeCShare =
      qualityScores.filter((row) => row.grade === "C").length /
      qualityScores.length;

    if (averageQuality < 72 || gradeCShare >= 0.25) {
      const severity: AlertSeverity =
        averageQuality < 65 || gradeCShare >= 0.35 ? "high" : "medium";
      output.push({
        id: "data-quality",
        title: "Fiabilite data en degradation",
        severity,
        ageLabel: "Fenetre 90 jours",
        impactLabel: `Score moyen ${round1(averageQuality)}/100, part C ${round1(gradeCShare * 100)}%`,
        actionHref: "/actions/history",
        actionLabel: "Corriger les lignes faibles",
      });
    }
  }

  const byArea = new Map<string, { actions: number; kg: number }>();
  for (const item of params.mapItems) {
    const area = extractArea(item.location_label || "");
    const row = byArea.get(area) ?? { actions: 0, kg: 0 };
    row.actions += 1;
    row.kg += Number(item.waste_kg || 0);
    byArea.set(area, row);
  }

  const criticalArea = [...byArea.entries()]
    .map(([area, stats]) => ({
      area,
      actions: stats.actions,
      kg: stats.kg,
      score: stats.actions * 2 + stats.kg,
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (criticalArea && criticalArea.actions >= 3) {
    const severity: AlertSeverity =
      criticalArea.actions >= 8 || criticalArea.kg >= 120 ? "high" : "medium";
    output.push({
      id: `critical-zone-${criticalArea.area}`,
      title: `Zone critique: ${criticalArea.area}`,
      severity,
      ageLabel: "Fenetre 120 jours",
      impactLabel: `${criticalArea.actions} actions, ${criticalArea.kg.toFixed(1)} kg`,
      actionHref: "/sections/compare",
      actionLabel: "Prioriser la zone",
    });
  }

  return output.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
}

export function computeCampaignGoalsByZone(params: {
  actions: ActionListItem[];
  now?: Date;
}): CampaignZoneGoal[] {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const floor90 = nowMs - 90 * DAY_MS;

  const grouped = new Map<
    string,
    {
      actions: number;
      kg: number;
      volunteers: number;
    }
  >();

  for (const item of params.actions) {
    if (item.status !== "approved") {
      continue;
    }
    const observed = parseMs(item.action_date);
    if (observed === null || observed < floor90 || observed > nowMs) {
      continue;
    }
    const area = extractArea(item.location_label || "");
    const row = grouped.get(area) ?? { actions: 0, kg: 0, volunteers: 0 };
    row.actions += 1;
    row.kg += Number(item.waste_kg || 0);
    row.volunteers += Number(item.volunteers_count || 0);
    grouped.set(area, row);
  }

  return [...grouped.entries()]
    .map(([area, row]) => {
      const paceActionsPerDay = row.actions / 90;
      const paceKgPerDay = row.kg / 90;
      const avgVolunteers = row.actions > 0 ? row.volunteers / row.actions : 0;

      const targetActions30d = Math.max(
        2,
        Math.round(paceActionsPerDay * 30 * 1.2),
      );
      const targetKg30d = Math.max(8, round1(paceKgPerDay * 30 * 1.15));
      const targetVolunteers30d = Math.max(
        4,
        Math.round(avgVolunteers * targetActions30d),
      );

      const priority: CampaignZoneGoal["priority"] =
        row.actions >= 10 || row.kg >= 150
          ? "haute"
          : row.actions >= 5 || row.kg >= 70
            ? "moyenne"
            : "faible";

      const justification =
        priority === "haute"
          ? "Pression terrain forte sur 90j: intensifier campagne et mobilisation."
          : priority === "moyenne"
            ? "Zone active: maintenir cadence et améliorer couverture."
            : "Zone a surveiller: actions ponctuelles ciblees.";

      return {
        area,
        priority,
        baselineActions90d: row.actions,
        baselineKg90d: round1(row.kg),
        targetActions30d,
        targetKg30d,
        targetVolunteers30d,
        justification,
      };
    })
    .sort(
      (a, b) =>
        b.targetActions30d - a.targetActions30d ||
        b.targetKg30d - a.targetKg30d,
    )
    .slice(0, 6);
}

export function computeNeighborhoodCampaignPlan(params: {
  actions: ActionListItem[];
  now?: Date;
}): NeighborhoodCampaignPlan[] {
  const now = params.now ?? new Date();
  const goals = computeCampaignGoalsByZone({
    actions: params.actions,
    now,
  }).slice(0, 6);

  return goals.map((goal) => {
    const weeklyCadence = Math.max(1, Math.ceil(goal.targetActions30d / 4));
    const staffingPerAction = Math.max(
      2,
      Math.ceil(goal.targetVolunteers30d / Math.max(goal.targetActions30d, 1)),
    );
    const qualityTargetScore =
      goal.priority === "haute" ? 82 : goal.priority === "moyenne" ? 78 : 74;
    const moderationSlaDays =
      goal.priority === "haute" ? 2 : goal.priority === "moyenne" ? 3 : 4;
    const rationale =
      goal.priority === "haute"
        ? "Concentrer les sorties sur les points recurrents et relancer les equipes a J-3."
        : goal.priority === "moyenne"
          ? "Maintenir une cadence stable avec revue qualite hebdomadaire."
          : "Lancer des interventions ponctuelles et verifier la geocouverture.";

    return {
      area: goal.area,
      priority: goal.priority,
      targetActions30d: goal.targetActions30d,
      targetKg30d: goal.targetKg30d,
      targetVolunteers30d: goal.targetVolunteers30d,
      weeklyCadence,
      staffingPerAction,
      qualityTargetScore,
      moderationSlaDays,
      checkpoint7d: addDays(now, 7),
      checkpoint21d: addDays(now, 21),
      rationale,
    };
  });
}
