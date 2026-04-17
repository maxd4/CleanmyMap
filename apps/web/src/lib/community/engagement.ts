import { extractEventRefFromNotes } from "../actions/event-link";
import { evaluateActionQuality } from "../actions/quality";
import type { ActionListItem } from "../actions/types";
import type { CommunityEventItem } from "./http";

export type EventConversionRow = {
  eventId: string;
  title: string;
  eventDate: string;
  locationLabel: string;
  capacityTarget: number | null;
  rsvpYes: number;
  rsvpMaybe: number;
  rsvpNo: number;
  attendanceCount: number | null;
  linkedActions: number;
  fillRate: number | null;
  rsvpToAttendanceRate: number | null;
  attendanceToActionRate: number | null;
  rsvpToActionRate: number | null;
};

export type EventConversionSummary = {
  eventsCount: number;
  rsvpYesTotal: number;
  attendanceTotalKnown: number;
  linkedActionsTotal: number;
  rsvpToAttendanceRate: number | null;
  attendanceToActionRate: number | null;
  rsvpToActionRate: number | null;
};

export type EventReminder = {
  eventId: string;
  priority: "haute" | "moyenne" | "faible";
  daysToEvent: number;
  reason: string;
  message: string;
};

export type EventStaffingRow = {
  eventId: string;
  title: string;
  eventDate: string;
  locationLabel: string;
  priority: "haute" | "moyenne" | "faible";
  expectedParticipants: number;
  recommendedStaff: number;
  confirmedStaff: number;
  staffingGap: number;
  riskLevel: "vert" | "orange" | "rouge";
  reason: string;
};

export type EventStaffingSummary = {
  eventsCount: number;
  atRiskCount: number;
  totalRecommendedStaff: number;
  totalConfirmedStaff: number;
  totalStaffingGap: number;
};

export type QualityLeaderboardRow = {
  actor: string;
  actions: number;
  wasteKg: number;
  avgQuality: number;
  qualityA: number;
  qualityB: number;
  qualityC: number;
  rateA: number;
  weightedScore: number;
  badge: string;
};

export type PartnerCard = {
  actor: string;
  role: string;
  zone: string;
  contact: string;
  capacity: string;
  actions: number;
  avgQuality: number;
  nextAction: string;
};

function toFinite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function percent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }
  return round1((numerator / denominator) * 100);
}

function parseEventDateMs(eventDate: string): number | null {
  const ms = new Date(`${eventDate}T12:00:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

function extractEventRefFromAction(item: ActionListItem): string | null {
  const candidates = [
    item.notes,
    item.notes_plain,
    item.contract?.metadata.notes,
    item.contract?.metadata.notesPlain,
  ];
  for (const candidate of candidates) {
    const ref = extractEventRefFromNotes(candidate);
    if (ref) {
      return ref;
    }
  }
  return null;
}

function badgeFromQuality(
  avgQuality: number,
  actions: number,
  rateA: number,
): string {
  if (avgQuality >= 85 && actions >= 8 && rateA >= 0.5) {
    return "Ambassadeur qualite";
  }
  if (avgQuality >= 75 && actions >= 10) {
    return "Pilier terrain";
  }
  if (avgQuality >= 70 && actions >= 5) {
    return "Contributeur fiable";
  }
  return "En progression";
}

function roleFromPartner(actions: number, avgQuality: number): string {
  if (actions >= 20 && avgQuality >= 75) {
    return "Coordinateur terrain";
  }
  if (actions >= 10) {
    return "Referent associatif";
  }
  return "Relais local";
}

function capacityLabel(actions: number): string {
  const monthly = actions / 12;
  if (monthly >= 3) {
    return "Forte (>=3 sorties/mois)";
  }
  if (monthly >= 1.5) {
    return "Moyenne (1 a 3 sorties/mois)";
  }
  return "Ponctuelle (<1.5 sortie/mois)";
}

function nextActionFromPartner(zone: string, avgQuality: number): string {
  if (avgQuality < 70) {
    return "Renforcer la qualite de declaration (preuve geo, completude).";
  }
  if (zone === "Hors arrondissement") {
    return "Preciser la zone d'action pour la prochaine intervention.";
  }
  return `Programmer une co-animation sur ${zone} avec objectif qualite maintenu.`;
}

export function computeEventConversions(
  events: CommunityEventItem[],
  actions: ActionListItem[],
): {
  rows: EventConversionRow[];
  summary: EventConversionSummary;
} {
  const linkedByEventId = new Map<string, number>();
  for (const item of actions) {
    const eventId = extractEventRefFromAction(item);
    if (!eventId) {
      continue;
    }
    linkedByEventId.set(eventId, (linkedByEventId.get(eventId) ?? 0) + 1);
  }

  const rows: EventConversionRow[] = events
    .map((event) => {
      const yes = event.rsvpCounts.yes;
      const linkedActions = linkedByEventId.get(event.id) ?? 0;
      const attendance = event.attendanceCount;
      const attendanceBase = attendance ?? yes;
      return {
        eventId: event.id,
        title: event.title,
        eventDate: event.eventDate,
        locationLabel: event.locationLabel,
        capacityTarget: event.capacityTarget,
        rsvpYes: yes,
        rsvpMaybe: event.rsvpCounts.maybe,
        rsvpNo: event.rsvpCounts.no,
        attendanceCount: attendance,
        linkedActions,
        fillRate: percent(yes, event.capacityTarget ?? 0),
        rsvpToAttendanceRate:
          attendance === null ? null : percent(attendance, yes),
        attendanceToActionRate: percent(linkedActions, attendanceBase),
        rsvpToActionRate: percent(linkedActions, yes),
      };
    })
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));

  const rsvpYesTotal = rows.reduce((acc, row) => acc + row.rsvpYes, 0);
  const attendanceTotalKnown = rows.reduce(
    (acc, row) => acc + (row.attendanceCount ?? 0),
    0,
  );
  const linkedActionsTotal = rows.reduce(
    (acc, row) => acc + row.linkedActions,
    0,
  );
  const hasAttendance = rows.some((row) => row.attendanceCount !== null);

  return {
    rows,
    summary: {
      eventsCount: rows.length,
      rsvpYesTotal,
      attendanceTotalKnown,
      linkedActionsTotal,
      rsvpToAttendanceRate: hasAttendance
        ? percent(attendanceTotalKnown, rsvpYesTotal)
        : null,
      attendanceToActionRate: hasAttendance
        ? percent(linkedActionsTotal, attendanceTotalKnown)
        : null,
      rsvpToActionRate: percent(linkedActionsTotal, rsvpYesTotal),
    },
  };
}

export function computeEventRelances(
  events: CommunityEventItem[],
  now: Date = new Date(),
): EventReminder[] {
  const nowMs = now.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const reminders: EventReminder[] = [];

  for (const event of events) {
    const eventMs = parseEventDateMs(event.eventDate);
    if (eventMs === null) {
      continue;
    }
    const daysToEvent = Math.floor((eventMs - nowMs) / DAY_MS);
    if (daysToEvent < 0 || daysToEvent > 14) {
      continue;
    }

    const yes = event.rsvpCounts.yes;
    const maybe = event.rsvpCounts.maybe;
    const fill = percent(yes, event.capacityTarget ?? 0);
    let priority: EventReminder["priority"] = "faible";
    let reason = "Maintenir le rythme de mobilisation.";

    if (daysToEvent <= 2 && (fill === null ? yes < 8 : fill < 85)) {
      priority = "haute";
      reason = "Evenement imminent avec remplissage insuffisant.";
    } else if (daysToEvent <= 5 && (fill === null ? yes < 10 : fill < 65)) {
      priority = "moyenne";
      reason = "Mobilisation a renforcer cette semaine.";
    } else if (daysToEvent <= 10 && maybe > yes) {
      priority = "moyenne";
      reason = "Beaucoup d'indecis: relance de confirmation necessaire.";
    } else if (fill !== null && fill < 80) {
      priority = "faible";
      reason = "Capacite non atteinte, relance preventive utile.";
    } else {
      continue;
    }

    const message =
      `Relance ${priority.toUpperCase()} - ${event.title} (${event.eventDate}) a ${event.locationLabel}. ` +
      `RSVP oui: ${yes}, maybe: ${maybe}${fill === null ? "" : `, remplissage: ${fill}%`}. ` +
      "Merci de confirmer votre presence et de partager a votre equipe.";

    reminders.push({
      eventId: event.id,
      priority,
      daysToEvent,
      reason,
      message,
    });
  }

  const priorityRank: Record<EventReminder["priority"], number> = {
    haute: 3,
    moyenne: 2,
    faible: 1,
  };
  return reminders.sort(
    (a, b) =>
      priorityRank[b.priority] - priorityRank[a.priority] ||
      a.daysToEvent - b.daysToEvent,
  );
}

export function computeEventStaffingPlan(
  events: CommunityEventItem[],
  now: Date = new Date(),
): {
  rows: EventStaffingRow[];
  summary: EventStaffingSummary;
} {
  const nowMs = now.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const rows = events
    .map((event) => {
      const eventMs = parseEventDateMs(event.eventDate);
      if (eventMs === null) {
        return null;
      }
      const daysToEvent = Math.floor((eventMs - nowMs) / DAY_MS);
      if (daysToEvent < 0 || daysToEvent > 45) {
        return null;
      }

      const yes = event.rsvpCounts.yes;
      const maybe = event.rsvpCounts.maybe;
      const expectedParticipants = Math.max(2, Math.round(yes + maybe * 0.4));
      const recommendedStaff = Math.max(2, Math.ceil(expectedParticipants / 6));
      const confirmedStaff = Math.max(0, Math.ceil(yes / 7));
      const staffingGap = Math.max(0, recommendedStaff - confirmedStaff);
      const fill = percent(yes, event.capacityTarget ?? 0);

      let riskLevel: EventStaffingRow["riskLevel"] = "vert";
      let priority: EventStaffingRow["priority"] = "faible";
      let reason =
        "Dimensionnement staffing coherent avec la mobilisation actuelle.";

      if (
        (daysToEvent <= 3 && staffingGap > 0) ||
        (fill !== null && fill < 45 && daysToEvent <= 5)
      ) {
        riskLevel = "rouge";
        priority = "haute";
        reason =
          "Evenement proche: renforcer les referents et relancer les confirmations.";
      } else if (staffingGap >= 2 || (fill !== null && fill < 65)) {
        riskLevel = "orange";
        priority = "moyenne";
        reason = "Mobilisation insuffisante pour absorber le volume cible.";
      }

      return {
        eventId: event.id,
        title: event.title,
        eventDate: event.eventDate,
        locationLabel: event.locationLabel,
        priority,
        expectedParticipants,
        recommendedStaff,
        confirmedStaff,
        staffingGap,
        riskLevel,
        reason,
      };
    })
    .filter((row): row is EventStaffingRow => row !== null)
    .sort((a, b) => {
      const priorityRank = { haute: 3, moyenne: 2, faible: 1 };
      return (
        priorityRank[b.priority] - priorityRank[a.priority] ||
        a.eventDate.localeCompare(b.eventDate)
      );
    });

  const summary = {
    eventsCount: rows.length,
    atRiskCount: rows.filter((row) => row.riskLevel !== "vert").length,
    totalRecommendedStaff: rows.reduce(
      (acc, row) => acc + row.recommendedStaff,
      0,
    ),
    totalConfirmedStaff: rows.reduce((acc, row) => acc + row.confirmedStaff, 0),
    totalStaffingGap: rows.reduce((acc, row) => acc + row.staffingGap, 0),
  };

  return { rows, summary };
}

export function computeQualityLeaderboard(
  actions: ActionListItem[],
): QualityLeaderboardRow[] {
  const grouped = new Map<
    string,
    {
      actions: number;
      wasteKg: number;
      qualitySum: number;
      qualityA: number;
      qualityB: number;
      qualityC: number;
    }
  >();

  for (const item of actions) {
    const actor =
      item.actor_name?.trim() ||
      item.contract?.metadata.actorName?.trim() ||
      "Anonyme";
    const quality = evaluateActionQuality(item);
    const row = grouped.get(actor) ?? {
      actions: 0,
      wasteKg: 0,
      qualitySum: 0,
      qualityA: 0,
      qualityB: 0,
      qualityC: 0,
    };
    row.actions += 1;
    row.wasteKg += toFinite(item.waste_kg, 0);
    row.qualitySum += quality.score;
    if (quality.grade === "A") {
      row.qualityA += 1;
    } else if (quality.grade === "B") {
      row.qualityB += 1;
    } else {
      row.qualityC += 1;
    }
    grouped.set(actor, row);
  }

  return [...grouped.entries()]
    .map(([actor, row]) => {
      const avgQuality = row.actions > 0 ? row.qualitySum / row.actions : 0;
      const rateA = row.actions > 0 ? row.qualityA / row.actions : 0;
      const weightedScore =
        avgQuality * 0.7 +
        rateA * 35 +
        Math.min(row.actions, 20) * 1.5 -
        row.qualityC * 2;
      return {
        actor,
        actions: row.actions,
        wasteKg: round1(row.wasteKg),
        avgQuality: round1(avgQuality),
        qualityA: row.qualityA,
        qualityB: row.qualityB,
        qualityC: row.qualityC,
        rateA: round1(rateA * 100),
        weightedScore: round1(weightedScore),
        badge: badgeFromQuality(avgQuality, row.actions, rateA),
      };
    })
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        b.avgQuality - a.avgQuality ||
        b.actions - a.actions,
    );
}

export function buildPartnerCards(actions: ActionListItem[]): PartnerCard[] {
  const grouped = new Map<
    string,
    {
      actions: number;
      qualitySum: number;
      zoneCounts: Map<string, number>;
    }
  >();

  for (const item of actions) {
    const actor =
      item.actor_name?.trim() ||
      item.contract?.metadata.actorName?.trim() ||
      "Anonyme";
    const quality = evaluateActionQuality(item);
    const zone = extractArea(
      item.location_label || item.contract?.location.label || "",
    );
    const row = grouped.get(actor) ?? {
      actions: 0,
      qualitySum: 0,
      zoneCounts: new Map<string, number>(),
    };
    row.actions += 1;
    row.qualitySum += quality.score;
    row.zoneCounts.set(zone, (row.zoneCounts.get(zone) ?? 0) + 1);
    grouped.set(actor, row);
  }

  return [...grouped.entries()]
    .map(([actor, row]) => {
      const avgQuality = row.actions > 0 ? row.qualitySum / row.actions : 0;
      const zone =
        [...row.zoneCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "Hors arrondissement";
      const contact = actor.includes("@")
        ? actor
        : `Canal communaute: ${actor}`;
      return {
        actor,
        role: roleFromPartner(row.actions, avgQuality),
        zone,
        contact,
        capacity: capacityLabel(row.actions),
        actions: row.actions,
        avgQuality: round1(avgQuality),
        nextAction: nextActionFromPartner(zone, avgQuality),
      };
    })
    .sort((a, b) => b.actions - a.actions || b.avgQuality - a.avgQuality)
    .slice(0, 12);
}
